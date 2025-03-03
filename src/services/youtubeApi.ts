import { VideoFile } from '../types';

// YouTube API scopes needed for uploading videos
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

// Client ID from Google Developer Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Initialize the Google API client
export const initGoogleApi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting Google API initialization with CLIENT_ID:', CLIENT_ID);
      
      if (!CLIENT_ID) {
        console.error('Google Client ID is missing');
        reject(new Error('Google Client ID is missing. Please check your .env file.'));
        return;
      }

      // Check if gapi is already loaded
      if (window.gapi && window.gapi.client) {
        console.log('GAPI client already loaded, initializing client');
        initClient(resolve, reject);
        return;
      }

      console.log('Loading GAPI script');
      // Load the Google API client library
      window.gapi.load('client:auth2', () => {
        console.log('GAPI client:auth2 loaded, initializing client');
        initClient(resolve, reject);
      });
    } catch (error) {
      console.error('Error in initGoogleApi:', error);
      reject(error);
    }
  });
};

const initClient = (resolve: (value: void) => void, reject: (reason?: any) => void) => {
  console.log('Initializing GAPI client with CLIENT_ID:', CLIENT_ID);
  
  window.gapi.client.init({
    apiKey: null,
    clientId: CLIENT_ID,
    scope: SCOPES.join(' '),
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
  }).then(() => {
    console.log('GAPI client initialized successfully');
    resolve();
  }).catch((error: any) => {
    console.error('Error initializing GAPI client:', error);
    reject(error);
  });
};

// Sign in the user
export const signIn = async (): Promise<gapi.auth2.GoogleUser> => {
  console.log('Attempting to sign in');
  const authInstance = gapi.auth2.getAuthInstance();
  
  // Используем простой вызов без указания redirect_uri
  return authInstance.signIn({
    prompt: 'select_account'
  });
};

// Sign out the user
export const signOut = async (): Promise<void> => {
  const authInstance = gapi.auth2.getAuthInstance();
  return authInstance.signOut();
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
  try {
    if (!window.gapi || !window.gapi.auth2) {
      console.log('gapi.auth2 is not available yet');
      return false;
    }
    
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.log('Auth instance is not available');
      return false;
    }
    
    const signedIn = authInstance.isSignedIn.get();
    console.log('User is signed in:', signedIn);
    return signedIn;
  } catch (error) {
    console.error('Error checking if user is signed in:', error);
    return false;
  }
};

// Get user profile
export const getUserProfile = (): { name: string; email: string; imageUrl: string } | null => {
  try {
    if (!isSignedIn()) return null;
    
    const authInstance = gapi.auth2.getAuthInstance();
    const user = authInstance.currentUser.get();
    const profile = user.getBasicProfile();
    
    return {
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl()
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