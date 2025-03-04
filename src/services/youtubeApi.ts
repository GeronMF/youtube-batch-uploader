import { VideoFile } from '../types';

// YouTube API scopes needed for uploading videos
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

// Client ID from Google Developer Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// API key from Google Developer Console
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

const ALLOWED_ORIGINS = process.env.VITE_ALLOWED_ORIGINS || [];

const loadGapiClient = async () => {
  console.log('Starting loadGapiClient...');
  
  // Загружаем только GAPI
  return new Promise<void>((resolve) => {
    gapi.load('client', async () => {
      try {
        console.log('GAPI loaded, initializing client...');
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
        });
        console.log('GAPI client initialized');
        resolve();
      } catch (error) {
        console.error('Error initializing GAPI client:', error);
        resolve(); // Продолжаем даже при ошибке
      }
    });
  });
};

// Инициализация Google API с использованием новой библиотеки Identity Services
export const initGoogleApi = async (): Promise<void> => {
  try {
    // Загружаем GAPI клиент
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client', {
        callback: resolve,
        onerror: reject
      });
    });

    // Инициализируем GAPI клиент
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'
      ]
    });

    // Инициализируем Google Identity Services
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (response.error) {
          console.error('Token client error:', response);
          return;
        }
        
        // Устанавливаем токен доступа
        window.gapi.client.setToken({
          access_token: response.access_token
        });
      }
    });

    // Сохраняем tokenClient для использования в других функциях
    window.tokenClient = tokenClient;
    
    console.log('Google API успешно инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации Google API:', error);
    throw error;
  }
};

// Обновленная функция входа с использованием Google Identity Services
export const signIn = async (): Promise<any> => {
  try {
    if (!window.tokenClient) {
      throw new Error('Token client не инициализирован');
    }

    return new Promise((resolve, reject) => {
      window.tokenClient.callback = (response) => {
        if (response.error) {
          reject(response);
          return;
        }
        
        window.gapi.client.setToken({
          access_token: response.access_token
        });
        resolve(response);
      };

      window.tokenClient.requestAccessToken({
        prompt: 'consent'
      });
    });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    throw error;
  }
};

// Обновленная функция выхода
export const signOut = async (): Promise<void> => {
  const token = window.gapi.client.getToken();
  if (token) {
    try {
      await google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  }
};

// Проверка авторизации
export const isSignedIn = (): boolean => {
  try {
    const token = window.gapi.client.getToken();
    return !!token && !!token.access_token;
  } catch (error) {
    console.error('Ошибка при проверке авторизации:', error);
    return false;
  }
};

// Get user profile
export const getUserProfile = async (): Promise<{ name: string; email: string; imageUrl: string } | null> => {
  try {
    if (!isSignedIn()) {
      console.log('User is not signed in');
      return null;
    }
    
    console.log('Fetching user profile...');
    const response = await gapi.client.youtube.channels.list({
      part: ['snippet,brandingSettings'],
      mine: true
    });
    
    console.log('Channel response:', response);
    const channel = response.result.items?.[0];
    if (!channel) {
      console.log('No channel found');
      return null;
    }
    
    return {
      name: channel.snippet?.title || '',
      email: channel.brandingSettings?.channel?.title || '',
      imageUrl: channel.snippet?.thumbnails?.default?.url || ''
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Upload a video to YouTube
export const uploadVideo = async (
  video: VideoFile, 
  onProgress: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const metadata = {
      snippet: {
        title: video.title || video.file.name,
        description: video.description || '',
        categoryId: '22' // People & Blogs category
      },
      status: {
        privacyStatus: video.privacy,
        selfDeclaredMadeForKids: false,
        monetizationDetails: {
          enableMonetization: video.monetization
        }
      }
    };

    const uploader = new window.gapi.client.youtube.videos.insert({
      part: ['snippet,status'],
      resource: metadata,
      media: {
        body: video.file
      }
    });

    // Set up the callback for tracking upload progress
    uploader.on('progress', (event: any) => {
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    });

    // Execute the upload
    uploader.execute((response: any) => {
      if (response && response.id) {
        const videoId = response.id;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // If there's a comment to add
        if (video.comment) {
          addComment(videoId, video.comment)
            .catch(error => console.error('Failed to add comment:', error));
        }
        
        resolve(videoUrl);
      } else {
        reject(new Error('Failed to upload video'));
      }
    });
  });
};

// Add a comment to a video
export const addComment = async (videoId: string, commentText: string): Promise<void> => {
  await window.gapi.client.youtube.commentThreads.insert({
    part: ['snippet'],
    resource: {
      snippet: {
        videoId: videoId,
        topLevelComment: {
          snippet: {
            textOriginal: commentText
          }
        }
      }
    }
  });
};