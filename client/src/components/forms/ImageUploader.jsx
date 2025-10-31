import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

const ImageUploader = ({ 
  onImageChange, 
  multiple = false, 
  maxFiles = 5,
  existingImages = []
}) => {
  const [previews, setPreviews] = useState(existingImages)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files).slice(0, maxFiles - previews.length)
    
    if (fileArray.length === 0) return

    const newPreviews = fileArray.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true
    }))

    const updatedPreviews = multiple ? [...previews, ...newPreviews] : newPreviews
    setPreviews(updatedPreviews)
    
    if (onImageChange) {
      const filesToSend = multiple ? updatedPreviews.map(p => p.file) : updatedPreviews[0]?.file
      onImageChange(filesToSend)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeImage = (index) => {
    const updatedPreviews = previews.filter((_, i) => i !== index)
    setPreviews(updatedPreviews)
    
    if (onImageChange) {
      const filesToSend = multiple ? updatedPreviews.map(p => p.file) : updatedPreviews[0]?.file
      onImageChange(filesToSend)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-blue-500 bg-blue-500 bg-opacity-10' 
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800 hover:bg-opacity-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full ${
              isDragging ? 'bg-blue-500' : 'bg-gray-700'
            }`}>
              {isDragging ? (
                <Upload className="w-6 h-6 text-white" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-300" />
              )}
            </div>
          </div>
          
          <div>
            <p className="text-lg font-medium text-white">
              {isDragging ? '釋放以上傳圖片' : '點擊或拖曳圖片到此處'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              支持 JPG, PNG, GIF, WEBP 格式，最大 10MB
              {multiple && `，最多 ${maxFiles} 張圖片`}
            </p>
          </div>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group"
            >
              <img
                src={preview.preview || preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageUploader
