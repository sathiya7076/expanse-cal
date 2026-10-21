import { useRef, useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import Button from '../ui/Button';

export default function Dropzone({ onFile, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-white'
        }`}
      >
        <FiUploadCloud className="size-10 text-brand-600" aria-hidden="true" />
        <p className="mt-3 font-semibold">Drop a receipt image here</p>
        <p className="mt-1 text-sm text-muted">JPG, PNG or WebP, up to 5 MB. Restaurant, grocery, fuel, medical or shopping bills.</p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>Browse files</Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose a receipt image"
          tabIndex={-1}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-expense/10 p-3 text-sm font-medium text-expense">{error}</p>}
    </div>
  );
}
