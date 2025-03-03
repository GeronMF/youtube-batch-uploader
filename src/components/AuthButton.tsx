import React from 'react';
import { LogIn, LogOut, Youtube } from 'lucide-react';
import { AuthState } from '../types';

interface AuthButtonProps {
  authState: AuthState;
  onSignIn: () => void;
  onSignOut: () => void;
}

const AuthButton: React.FC<AuthButtonProps> = ({ authState, onSignIn, onSignOut }) => {
  const { isSignedIn, userProfile } = authState;

  return (
    <div className="flex items-center">
      {isSignedIn && userProfile ? (
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <img 
              src={userProfile.imageUrl} 
              alt={userProfile.name} 
              className="h-8 w-8 rounded-full mr-2"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
              <p className="text-xs text-gray-500">{userProfile.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <LogOut size={14} className="mr-1" />
            Выйти
          </button>
        </div>
      ) : (
        <button
          onClick={onSignIn}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Youtube size={18} className="mr-2" />
          Войти через YouTube
        </button>
      )}
    </div>
  );
};

export default AuthButton;