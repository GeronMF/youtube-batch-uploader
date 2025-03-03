import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Plus } from 'lucide-react';
import { VideoFile } from '../types';

interface VideoUploaderProps {
  onFilesAdded: (files: File[]) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv']
    },
    multiple: true
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm font-medium text-gray-900">
        {isDragActive ? 'Перетащите видео сюда' : 'Перетащите видео сюда или нажмите для выбора файлов'}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        MP4, MOV, AVI, WMV, FLV, MKV до 10ГБ
      </p>
    </div>
  );
};

export default VideoUploader;