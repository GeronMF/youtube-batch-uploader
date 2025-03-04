/// <reference types="vite/client" />

interface Window {
  gapiLoadedCallback?: () => void;
  gisLoadedCallback?: () => void;
  gapi: any;
  google?: any;
  tokenClient?: any;
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

  namespace client {
    function setToken(token: { access_token: string } | null): void;
    function getToken(): { access_token: string } | null;
  }
}

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: any) => void;
      }): any;
      function revoke(token: string): Promise<void>;
    }
  }
}