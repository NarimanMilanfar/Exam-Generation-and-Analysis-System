import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => {
  return function MockedImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock fetch
global.fetch = jest.fn();

// Test component that mimics image upload functionality
const TestImageUpload = ({ 
  initialImage = null, 
  onImageChange = jest.fn(),
  maxSize = 2 * 1024 * 1024,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"]
}: any) => {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string>(initialImage || '');
  const [imageLoading, setImageLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WEBP images are allowed');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('Image size must be less than 2MB');
      return;
    }

    setSelectedImage(file);
    setImageLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setImageLoading(false);
      onImageChange(file);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div data-testid="image-upload-component">
      <div data-testid="avatar-section">
        <div className="avatar-container">
          {imageLoading ? (
            <div data-testid="loading-spinner">Loading...</div>
          ) : imagePreview ? (
            <img 
              data-testid="preview-image"
              src={imagePreview}
              alt="Preview"
              width={80}
              height={80}
            />
          ) : (
            <div data-testid="default-avatar">No Image</div>
          )}
        </div>
        <button
          type="button"
          onClick={triggerFileInput}
          data-testid="change-photo-button"
        >
          Change Photo
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept={allowedTypes.join(', ')}
        onChange={handleImageChange}
        data-testid="file-input"
        style={{ display: 'none' }}
      />

      {error && (
        <div data-testid="error-message" className="error">
          {error}
        </div>
      )}

      {selectedImage && (
        <div data-testid="upload-notification">
          New photo selected. Click save to update.
        </div>
      )}
    </div>
  );
};

// Test component for form submission with image
const TestImageUploadForm = ({ onSubmit = jest.fn() }: any) => {
  const [formData, setFormData] = React.useState({
    name: 'Test User',
    email: 'test@example.com',
  });
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    
    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('email', formData.email);
    if (selectedImage) {
      submitData.append('image', selectedImage);
    }

    await onSubmit(submitData);
    setSaving(false);
  };

  return (
    <div data-testid="upload-form">
      <TestImageUpload onImageChange={setSelectedImage} />
      <input
        data-testid="name-input"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      />
      <input
        data-testid="email-input"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
      />
      <button
        data-testid="save-button"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};

describe('Image Upload Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Upload Component', () => {
    it('renders default state without image', () => {
      render(<TestImageUpload />);
      
      expect(screen.getByTestId('default-avatar')).toBeInTheDocument();
      expect(screen.getByText('No Image')).toBeInTheDocument();
      expect(screen.getByTestId('change-photo-button')).toBeInTheDocument();
    });

    it('shows existing image when provided', () => {
      const existingImage = 'data:image/png;base64,test123';
      render(<TestImageUpload initialImage={existingImage} />);
      
      const previewImage = screen.getByTestId('preview-image');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', existingImage);
    });

    it('triggers file input when change photo button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestImageUpload />);
      
      const changeButton = screen.getByTestId('change-photo-button');
      const fileInput = screen.getByTestId('file-input');
      
      // Mock click event on hidden input
      const clickSpy = jest.spyOn(fileInput, 'click');
      
      await user.click(changeButton);
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('File Validation', () => {
    it('accepts valid image types', async () => {
      const onImageChange = jest.fn();
      render(<TestImageUpload onImageChange={onImageChange} />);
      
      const fileInput = screen.getByTestId('file-input');
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        result: 'data:image/jpeg;base64,test123'
      };
      
      global.FileReader = jest.fn(() => mockFileReader) as any;
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test123' } });
      
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('rejects invalid file types', async () => {
      render(<TestImageUpload />);
      
      const fileInput = screen.getByTestId('file-input');
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Only JPEG, PNG, and WEBP images are allowed')).toBeInTheDocument();
    });

    it('rejects files that are too large', async () => {
      const maxSize = 1024; // 1KB for testing
      render(<TestImageUpload maxSize={maxSize} />);
      
      const fileInput = screen.getByTestId('file-input');
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Image size must be less than 2MB')).toBeInTheDocument();
    });

    it('shows loading state during image processing', async () => {
      render(<TestImageUpload />);
      
      const fileInput = screen.getByTestId('file-input');
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader that doesn't complete immediately
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
      };
      
      global.FileReader = jest.fn(() => mockFileReader) as any;
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Image Preview and Notification', () => {
    it('shows upload notification when image is selected', async () => {
      render(<TestImageUpload />);
      
      const fileInput = screen.getByTestId('file-input');
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        result: 'data:image/jpeg;base64,test123'
      };
      
      global.FileReader = jest.fn(() => mockFileReader) as any;
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      // Simulate FileReader completion
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test123' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('upload-notification')).toBeInTheDocument();
        expect(screen.getByText('New photo selected. Click save to update.')).toBeInTheDocument();
      });
    });

    it('updates preview image after successful upload', async () => {
      render(<TestImageUpload />);
      
      const fileInput = screen.getByTestId('file-input');
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        result: 'data:image/jpeg;base64,test123'
      };
      
      global.FileReader = jest.fn(() => mockFileReader) as any;
      
      fireEvent.change(fileInput, { target: { files: [validFile] } });
      
      // Simulate FileReader completion
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test123' } });
      
      await waitFor(() => {
        const previewImage = screen.getByTestId('preview-image');
        expect(previewImage).toBeInTheDocument();
        expect(previewImage).toHaveAttribute('src', 'data:image/jpeg;base64,test123');
      });
    });
  });

  describe('Form Integration', () => {
    it('includes image in form submission', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<TestImageUploadForm onSubmit={onSubmit} />);
      
      // Select an image
      const fileInput = screen.getByTestId('file-input');
      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
      };
      
      global.FileReader = jest.fn(() => mockFileReader) as any;
      
      fireEvent.change(fileInput, { target: { files: [imageFile] } });
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test123' } });
      
      // Submit form
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);
      
      expect(onSubmit).toHaveBeenCalledWith(expect.any(FormData));
      
      // Verify FormData contains image
      const formData = onSubmit.mock.calls[0][0];
      expect(formData.get('image')).toBe(imageFile);
      expect(formData.get('name')).toBe('Test User');
      expect(formData.get('email')).toBe('test@example.com');
    });

    it('shows saving state during form submission', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      
      render(<TestImageUploadForm onSubmit={onSubmit} />);
      
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });
  });
}); 