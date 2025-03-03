/// <reference types="vite/client" />

interface Window {
  gapi: any;
}

declare namespace gapi {
  namespace auth2 {
    interface GoogleUser {
      getBasicProfile(): {
        getName(): string;
        getEmail(): string;
        getImageUrl(): string;
      };
      getAuthResponse(): {
        access_token: string;
      };
    }
    
    interface AuthInstance {
      isSignedIn: {
        get(): boolean;
      };
      signIn(): Promise<GoogleUser>;
      signOut(): Promise<void>;
      currentUser: {
        get(): GoogleUser;
      };
    }
    
    function getAuthInstance(): AuthInstance;
  }
}