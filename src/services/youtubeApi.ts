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

const loadGapiClient = async () => {
  console.log('Starting loadGapiClient...');
  
  // Ждем загрузки GAPI
  await new Promise<void>((resolve) => {
    console.log('Waiting for GAPI to load...');
    window.gapiLoadedCallback = () => {
      console.log('GAPI loaded successfully');
      resolve();
    };
    if (window.gapi) {
      console.log('GAPI already loaded');
      resolve();
    }
  });

  // Ждем загрузки GSI
  await new Promise<void>((resolve) => {
    console.log('Waiting for GSI to load...');
    window.gisLoadedCallback = () => {
      console.log('GSI loaded successfully');
      resolve();
    };
    if (window.google?.accounts) {
      console.log('GSI already loaded');
      resolve();
    }
  });

  // Инициализируем GAPI
  await new Promise<void>((resolve, reject) => {
    console.log('Initializing GAPI client...');
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
        });
        console.log('GAPI client initialized successfully');
        resolve();
      } catch (error) {
        console.error('Error initializing GAPI client:', error);
        reject(error);
      }
    });
  });
};

// Initialize the Google API client
export const initGoogleApi = async (): Promise<void> => {
  console.log('Starting initGoogleApi...');
  await loadGapiClient();
  console.log('loadGapiClient completed successfully');
  
  // Не запрашиваем токен при инициализации
  return Promise.resolve();
};

// Sign in the user
export const signIn = async (): Promise<any> => {
  console.log('Starting sign in process...');
  let tokenClient: any;
  
  return new Promise((resolve, reject) => {
    try {
      console.log('Initializing token client...');
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: (tokenResponse: any) => {
          console.log('Sign in callback received:', tokenResponse ? 'with token' : 'no token');
          if (tokenResponse?.access_token) {
            console.log('Setting access token in callback...');
            gapi.client.setToken(tokenResponse);
            console.log('Access token set in callback');
            resolve(tokenResponse);
          } else {
            console.error('No access token in response');
            reject(new Error('No access token received'));
          }
        }
      });

      console.log('Requesting access token...');
      tokenClient.requestAccessToken({
        prompt: 'consent',
        hint: 'Выберите аккаунт YouTube для загрузки видео'
      });
    } catch (err) {
      console.error('Error in sign in process:', err);
      reject(err);
    }
  });
};

// Sign out the user
export const signOut = async (): Promise<void> => {
  const token = gapi.client.getToken();
  if (token) {
    try {
      await google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
  try {
    const token = gapi.client.getToken();
    console.log('Current token state:', {
      hasToken: !!token,
      hasAccessToken: !!token?.access_token,
      tokenType: token?.token_type,
      expiresIn: token?.expires_in
    });
    return !!token && !!token.access_token;
  } catch (error) {
    console.error('Error checking if user is signed in:', error);
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