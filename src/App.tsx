import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Upload, Youtube, ExternalLink } from 'lucide-react';
import VideoUploader from './components/VideoUploader';
import VideoItem from './components/VideoItem';
import AuthButton from './components/AuthButton';
import { VideoFile, AuthState } from './types';
import { initGoogleApi, signIn, signOut, isSignedIn, getUserProfile, uploadVideo } from './services/youtubeApi';

function App() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    accessToken: null,
    userProfile: null
  });
  const [isApiInitialized, setIsApiInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Google API
  useEffect(() => {
    const initApi = async () => {
      try {
        setIsInitializing(true);
        console.log('Initializing Google API...');
        await initGoogleApi();
        console.log('Google API initialized successfully');
        setIsApiInitialized(true);
        setApiError(null);
        setApiErrorDetails(null);
        
        // Check if user is already signed in
        if (isSignedIn()) {
          console.log('User is already signed in');
          setAuthState({
            isSignedIn: true,
            accessToken: gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token,
            userProfile: getUserProfile()
          });
        } else {
          console.log('User is not signed in');
        }
      } catch (error: any) {
        console.error('Error initializing Google API:', error);
        setApiError('Ошибка инициализации Google API. Пожалуйста, проверьте ваш Client ID и убедитесь, что он правильно настроен в консоли Google Cloud.');
        setApiErrorDetails(error);
        setIsApiInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initApi();
  }, []);

  // Handle file uploads
  const handleFilesAdded = (files: File[]) => {
    const newVideos = files.map(file => ({
      id: uuidv4(),
      file,
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      description: '',
      privacy: 'unlisted' as const,
      monetization: false,
      comment: '',
      uploadStatus: 'pending' as const,
      progress: 0,
      videoUrl: ''
    }));
    
    setVideos(prev => [...prev, ...newVideos]);
  };

  // Update video metadata
  const handleUpdateVideo = (id: string, updates: Partial<VideoFile>) => {
    setVideos(prev => 
      prev.map(video => 
        video.id === id ? { ...video, ...updates } : video
      )
    );
  };

  // Remove video from list
  const handleRemoveVideo = (id: string) => {
    setVideos(prev => prev.filter(video => video.id !== id));
  };

  // Handle sign in
  const handleSignIn = async () => {
    try {
      setApiError(null);
      console.log('Attempting to sign in...');
      const user = await signIn();
      console.log('Sign in successful');
      setAuthState({
        isSignedIn: true,
        accessToken: user.getAuthResponse().access_token,
        userProfile: getUserProfile()
      });
    } catch (error) {
      console.error('Error signing in:', error);
      setApiError('Ошибка входа в аккаунт. Пожалуйста, попробуйте снова или проверьте настройки вашего Google API.');
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthState({
        isSignedIn: false,
        accessToken: null,
        userProfile: null
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Upload all videos
  const handleUploadAll = async () => {
    if (!authState.isSignedIn) {
      alert('Пожалуйста, войдите в аккаунт YouTube для загрузки видео');
      return;
    }
    
    setIsUploading(true);
    
    // Filter videos that are pending upload
    const pendingVideos = videos.filter(v => v.uploadStatus === 'pending');
    
    for (const video of pendingVideos) {
      // Update status to uploading
      handleUpdateVideo(video.id, { uploadStatus: 'uploading', progress: 0 });
      
      try {
        // Upload the video
        const videoUrl = await uploadVideo(
          video,
          (progress) => handleUpdateVideo(video.id, { progress })
        );
        
        // Update with success status and video URL
        handleUpdateVideo(video.id, { 
          uploadStatus: 'success', 
          progress: 100,
          videoUrl
        });
      } catch (error) {
        console.error('Error uploading video:', error);
        handleUpdateVideo(video.id, { uploadStatus: 'error' });
      }
    }
    
    setIsUploading(false);
  };

  // Extract domain from error message
  const extractDomain = (errorDetails: any): string | null => {
    if (!errorDetails || !errorDetails.details) return null;
    
    const match = errorDetails.details.match(/https:\/\/[^\\s]+ has not been registered/);
    if (match) {
      return match[0].replace(' has not been registered', '');
    }
    return null;
  };

  // Get current domain
  const getCurrentDomain = (): string => {
    return window.location.origin;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Youtube className="h-8 w-8 text-red-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">YouTube Batch Uploader</h1>
            </div>
            {isInitializing ? (
              <div className="flex items-center">
                <div className="animate-pulse bg-gray-300 h-8 w-32 rounded"></div>
              </div>
            ) : (
              <AuthButton 
                authState={authState}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {apiError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Ошибка! </strong>
            <span className="block sm:inline">{apiError}</span>
            
            <div className="mt-2 text-sm">
              <p className="font-semibold">Убедитесь, что:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Ваш Client ID правильно указан в файле .env</li>
                <li>В консоли Google Cloud API включен YouTube Data API v3</li>
                <li>В настройках OAuth указан правильный redirect URI (включая localhost для тестирования)</li>
              </ul>
              
              {apiErrorDetails && apiErrorDetails.error === 'idpiframe_initialization_failed' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold text-yellow-800">Ошибка домена:</p>
                  <p className="mt-1">Текущий домен не зарегистрирован в консоли Google Cloud.</p>
                  
                  <div className="mt-2">
                    <p className="font-medium">Необходимо добавить следующий домен в список разрешенных JavaScript источников:</p>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                      {extractDomain(apiErrorDetails) || getCurrentDomain()}
                    </code>
                  </div>
                  
                  <div className="mt-3">
                    <p className="font-medium">Инструкция:</p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1">
                      <li>Перейдите в <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                        Google Cloud Console <ExternalLink size={14} className="ml-1" />
                      </a></li>
                      <li>Выберите ваш проект</li>
                      <li>Перейдите в раздел "Credentials" (Учетные данные)</li>
                      <li>Найдите и отредактируйте ваш OAuth 2.0 Client ID</li>
                      <li>В разделе "Authorized JavaScript origins" (Разрешенные источники JavaScript) добавьте URL, указанный выше</li>
                      <li>Сохраните изменения</li>
                      <li>Подождите несколько минут для применения изменений</li>
                      <li>Перезагрузите эту страницу</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isInitializing ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            <span className="ml-3 text-gray-700">Инициализация API...</span>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <VideoUploader onFilesAdded={handleFilesAdded} />
            </div>
            
            {videos.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Видео ({videos.length})</h2>
                  <button
                    onClick={handleUploadAll}
                    disabled={!authState.isSignedIn || isUploading || videos.every(v => v.uploadStatus !== 'pending')}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white 
                      ${!authState.isSignedIn || isUploading || videos.every(v => v.uploadStatus !== 'pending')
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                  >
                    <Upload size={18} className="mr-2" />
                    {isUploading ? 'Загрузка...' : 'Загрузить все'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map(video => (
                    <VideoItem
                      key={video.id}
                      video={video}
                      onUpdate={handleUpdateVideo}
                      onRemove={handleRemoveVideo}
                    />
                  ))}
                </div>
              </>
            )}
            
            {videos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Видео еще не добавлены. Добавьте видео, чтобы начать.</p>
              </div>
            )}
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>Для работы с YouTube API необходимо войти в аккаунт YouTube, нажав кнопку "Войти через YouTube" в правом верхнем углу.</p>
            <p className="mt-1">Если возникают проблемы с авторизацией, проверьте настройки вашего Google Cloud проекта.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;