import React, { useState } from 'react';
import { VideoFile } from '../types';
import { Trash2, Edit, Check, X, ExternalLink } from 'lucide-react';

interface VideoItemProps {
  video: VideoFile;
  onUpdate: (id: string, updates: Partial<VideoFile>) => void;
  onRemove: (id: string) => void;
}

const VideoItem: React.FC<VideoItemProps> = ({ video, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: video.title,
    description: video.description,
    privacy: video.privacy,
    monetization: video.monetization,
    comment: video.comment
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    onUpdate(video.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      title: video.title,
      description: video.description,
      privacy: video.privacy,
      monetization: video.monetization,
      comment: video.comment
    });
    setIsEditing(false);
  };

  // Translate status messages to Russian
  const getStatusMessage = (status: string, progress: number) => {
    if (status === 'uploading') return `Загрузка: ${progress}%`;
    if (status === 'error') return 'Ошибка загрузки. Попробуйте снова.';
    return '';
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{video.title || video.file.name}</h3>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-500 hover:text-blue-500"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => onRemove(video.id)}
                  className="p-1 text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleSave}
                  className="p-1 text-gray-500 hover:text-green-500"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={handleCancel}
                  className="p-1 text-gray-500 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>
        
        {video.uploadStatus === 'success' && video.videoUrl && (
          <div className="mt-2">
            <a 
              href={video.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink size={14} className="mr-1" />
              Смотреть на YouTube
            </a>
          </div>
        )}
        
        {video.uploadStatus === 'uploading' && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${video.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{getStatusMessage(video.uploadStatus, video.progress)}</p>
          </div>
        )}
        
        {video.uploadStatus === 'error' && (
          <p className="text-xs text-red-500 mt-1">{getStatusMessage(video.uploadStatus, 0)}</p>
        )}
      </div>
      
      <div className="p-4">
        {!isEditing ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Название</p>
              <p className="text-sm">{video.title || 'Без названия'}</p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500">Описание</p>
              <p className="text-sm line-clamp-2">{video.description || 'Без описания'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Приватность</p>
                <p className="text-sm capitalize">
                  {video.privacy === 'public' ? 'Публичное' : 
                   video.privacy === 'unlisted' ? 'По ссылке' : 'Приватное'}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Монетизация</p>
                <p className="text-sm">{video.monetization ? 'Включена' : 'Отключена'}</p>
              </div>
            </div>
            
            {video.comment && (
              <div>
                <p className="text-xs text-gray-500">Комментарий</p>
                <p className="text-sm">{video.comment}</p>
              </div>
            )}
          </div>
        ) : (
          <form className="space-y-3">
            <div>
              <label htmlFor={`title-${video.id}`} className="block text-xs text-gray-500">
                Название
              </label>
              <input
                id={`title-${video.id}`}
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor={`description-${video.id}`} className="block text-xs text-gray-500">
                Описание
              </label>
              <textarea
                id={`description-${video.id}`}
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`privacy-${video.id}`} className="block text-xs text-gray-500">
                  Приватность
                </label>
                <select
                  id={`privacy-${video.id}`}
                  name="privacy"
                  value={formData.privacy}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="public">Публичное</option>
                  <option value="unlisted">По ссылке</option>
                  <option value="private">Приватное</option>
                </select>
              </div>
              
              <div className="flex items-end mb-2">
                <div className="flex items-center h-5">
                  <input
                    id={`monetization-${video.id}`}
                    name="monetization"
                    type="checkbox"
                    checked={formData.monetization}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-2">
                  <label htmlFor={`monetization-${video.id}`} className="text-xs text-gray-500">
                    Монетизация
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor={`comment-${video.id}`} className="block text-xs text-gray-500">
                Комментарий
              </label>
              <input
                id={`comment-${video.id}`}
                name="comment"
                type="text"
                value={formData.comment}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default VideoItem;