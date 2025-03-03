export interface VideoFile {
  id: string;
  file: File;
  title: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
  monetization: boolean;
  comment: string;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  videoUrl: string;
}

export interface AuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  userProfile: {
    name: string;
    email: string;
    imageUrl: string;
  } | null;
}