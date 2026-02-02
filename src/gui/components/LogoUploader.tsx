import React, { useState } from 'react';
import '../styles/LogoUploader.css';

interface LogoUploaderProps {
  onLogoSelect: (logoPath: string, logoData: string) => void;
}

export default function LogoUploader({ onLogoSelect }: LogoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoName(file.name);
      onLogoSelect(file.name, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoPreview(null);
    setLogoName(null);
    onLogoSelect('', '');
  };

  return (
    <div className="logo-uploader">
      <h3>Church Logo (Optional)</h3>

      {logoPreview ? (
        <div className="logo-preview">
          <div className="preview-image-container">
            <img src={logoPreview} alt="Logo preview" className="preview-image" />
          </div>
          <p className="logo-filename">{logoName}</p>
          <button className="clear-logo-button" onClick={clearLogo}>
            Change Logo
          </button>
        </div>
      ) : (
        <>
          <div
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="drop-content">
              <div className="drop-icon">⬇</div>
              <p className="drop-text">Drag your logo here</p>
              <p className="drop-subtext">or click to select</p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="file-input"
              id="logo-input"
            />
          </div>

          <p className="upload-hint">PNG, JPG, or GIF • Max 5MB</p>
        </>
      )}
    </div>
  );
}
