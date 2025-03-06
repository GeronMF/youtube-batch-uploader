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

// В начале файла добавим проверку
console.log('API Key exists:', !!API_KEY);
console.log('Client ID exists:', !!CLIENT_ID);

// Убираем токены из кода
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN || '';
const INITIAL_ACCESS_TOKEN = import.meta.env.VITE_GOOGLE_ACCESS_TOKEN || '';

// Функция для ожидания загрузки GAPI
const waitForGAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.gapi?.client) {
      resolve();
      return;
    }

    const checkGAPI = () => {
      if (window.gapi?.client) {
        resolve();
      } else {
        setTimeout(checkGAPI, 100);
      }
    };

    checkGAPI();
  });
};

// Функция для ожидания загрузки Google Identity Services
const waitForGIS = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const checkGIS = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        setTimeout(checkGIS, 100);
      }
    };

    checkGIS();
  });
};

// Функция для включения Google API сервиса
const enableGoogleService = async (serviceName: string) => {
  try {
    console.log(`Enabling ${serviceName}...`);
    
    // Используем fetch напрямую с токеном
    const response = await fetch(
      `https://serviceusage.googleapis.com/v1/projects/my-project-194135961/services/${serviceName}:enable`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INITIAL_ACCESS_TOKEN}`, // Используем начальный токен
          'Content-Length': '0'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to enable ${serviceName}: ${error.error?.message || 'Unknown error'}`);
    }

    console.log(`Successfully enabled ${serviceName}`);
  } catch (error) {
    console.error(`Error enabling ${serviceName}:`, error);
    throw error;
  }
};

// Убираем включение API из initGoogleApi
export const initGoogleApi = async (): Promise<void> => {
  try {
    console.log('Starting Google API initialization...');
    
    await Promise.all([waitForGAPI(), waitForGIS()]);
    console.log('GAPI and GIS loaded successfully');

    // Сначала инициализируем только с YouTube API
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'
      ]  // Убираем serviceusage API
    });

    if (INITIAL_ACCESS_TOKEN) {
      window.gapi.client.setToken({
        access_token: INITIAL_ACCESS_TOKEN
      });
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: async (response) => {
        if (response.error) {
          throw response;
        }
        window.gapi.client.setToken({
          access_token: response.access_token
        });
      }
    });

    window.tokenClient = tokenClient;
    console.log('Google API initialized successfully');
    
  } catch (error) {
    console.error('Error during API initialization:', error);
    throw error;
  }
};

// Добавим функцию обновления токена через refresh token
const refreshAccessToken = async () => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();
    if (data.access_token) {
      window.gapi.client.setToken({
        access_token: data.access_token
      });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// Обновляем функцию проверки авторизации
export const isSignedIn = async (): Promise<boolean> => {
  const token = window.gapi.client.getToken();
  if (!token?.access_token) {
    return false;
  }

  try {
    // Пробуем сделать тестовый запрос
    await gapi.client.youtube.channels.list({
      part: ['snippet'],
      mine: true
    });
    return true;
  } catch (error: any) {
    if (error?.status === 401) {
      // Токен истек, пробуем обновить
      try {
        await refreshAccessToken();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

// Get user profile
export const getUserProfile = async (): Promise<{ name: string; email: string; imageUrl: string } | null> => {
  try {
    // Проверяем токен
    const token = window.gapi.client.getToken();
    if (!token?.access_token) {
      console.log('No access token available');
      return null;
    }

    console.log('Fetching user profile with token:', token.access_token);
    
    // Пробуем обновить токен перед запросом
    try {
      await refreshAccessToken();
    } catch (error) {
      console.log('Failed to refresh token, continuing with current token');
    }
    
    // Делаем запрос с обновленным токеном
    const response = await gapi.client.youtube.channels.list({
      part: ['snippet,brandingSettings'],
      mine: true,
      headers: {
        'Authorization': `Bearer ${window.gapi.client.getToken()?.access_token}`
      }
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

// Функция для обмена authorization code на токены
const exchangeAuthCode = async (authCode: string) => {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        redirect_uri: window.location.origin,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (data.access_token) {
      // Сохраняем токены
      window.gapi.client.setToken({
        access_token: data.access_token
      });
      
      // Выводим refresh_token для сохранения
      if (data.refresh_token) {
        console.log('New refresh token:', data.refresh_token);
      }

      return data;
    } else {
      throw new Error('Failed to exchange auth code for tokens');
    }
  } catch (error) {
    console.error('Error exchanging auth code:', error);
    throw error;
  }
};

// Обновляем функцию signIn
export const signIn = async (): Promise<void> => {
  if (!window.tokenClient) {
    throw new Error('Token client not initialized');
  }

  return new Promise((resolve, reject) => {
    try {
      window.tokenClient.callback = async (response) => {
        if (response.error) {
          reject(response);
          return;
        }

        try {
          // Если получили authorization code
          if (response.code) {
            // Обмениваем код на токены
            const tokens = await exchangeAuthCode(response.code);
            console.log('Successfully exchanged auth code for tokens');
          }

          // Проверяем авторизацию
          const testResponse = await gapi.client.youtube.channels.list({
            part: ['snippet'],
            mine: true
          });

          if (testResponse.status === 200) {
            console.log('Successfully authenticated with YouTube');
            resolve();
          } else {
            reject(new Error('Failed to authenticate with YouTube'));
          }
        } catch (error) {
          console.error('Error during authentication:', error);
          reject(error);
        }
      };

      // Запрашиваем и code, и token
      window.tokenClient.requestAccessToken({
        prompt: 'consent',
        response_type: 'code token'
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Функция выхода
export const signOut = async (): Promise<void> => {
  const token = window.gapi.client.getToken();
  if (token) {
    try {
      await window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
};