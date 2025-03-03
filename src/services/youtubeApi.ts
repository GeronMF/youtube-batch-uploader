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
  // Ждем загрузки gapi
  if (!window.gapi) {
    await new Promise<void>((resolve) => {
      const checkGapi = () => {
        if (window.gapi) {
          resolve();
        } else {
          setTimeout(checkGapi, 100);
        }
      };
      checkGapi();
    });
  }

  // Ждем загрузки google.accounts
  if (!window.google?.accounts) {
    await new Promise<void>((resolve) => {
      const checkGoogle = () => {
        if (window.google?.accounts) {
          resolve();
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      checkGoogle();
    });
  }

  // Инициализируем gapi.client
  await new Promise<void>((resolve) => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
      });
      resolve();
    });
  });
};

// Initialize the Google API client
export const initGoogleApi = async (): Promise<void> => {
  await loadGapiClient();
  
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore
      google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: (response: any) => {
          if (response.access_token) {
            // @ts-ignore
            gapi.client.setToken(response.access_token);
            resolve();
          }
        },
      });
    } catch (error) {
      console.error('Error in initGoogleApi:', error);
      reject(error);
    }
  });
};

// Sign in the user
export const signIn = async (): Promise<any> => {
  // @ts-ignore
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    callback: () => {}, // Будет переопределен при вызове
  });

  return new Promise((resolve, reject) => {
    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

// Sign out the user
export const signOut = async (): Promise<void> => {
  // @ts-ignore
  google.accounts.oauth2.revoke(gapi.client.getToken().access_token);
  // @ts-ignore
  gapi.client.setToken(null);
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
  try {
    // @ts-ignore
    const token = gapi.client.getToken();
    return !!token;
  } catch (error) {
    console.error('Error checking if user is signed in:', error);
    return false;
  }
};

// Get user profile
export const getUserProfile = async (): Promise<{ name: string; email: string; imageUrl: string } | null> => {
  try {
    if (!isSignedIn()) return null;
    
    const response = await gapi.client.youtube.channels.list({
      part: ['snippet'],
      mine: true
    });
    
    const channel = response.result.items?.[0];
    if (!channel) return null;
    
    return {
      name: channel.snippet?.title || '',
      email: '', // Email не доступен через YouTube API
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