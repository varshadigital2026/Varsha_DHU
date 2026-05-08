import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Upload, X, Image as ImageIcon, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Label } from './ui/label';

interface UploadModuleProps {
  onUploadComplete: (images: string[], unitsInspected: number, category: string) => void;
  isProcessing: boolean;
}

const GARMENT_CATEGORIES = [
  "Shirt",
  "T-Shirt",
  "Pants",
  "Jeans",
  "Jacket",
  "Dress",
  "Skirt",
  "Outerwear"
];

const VIEW_TYPES = [
  { id: 'render', label: 'Render Image (Reference)' },
  { id: 'pressure', label: 'Pressure Map' },
  { id: 'fit', label: 'Fit Map' },
  { id: 'stress', label: 'Stress Map' },
  { id: 'strain', label: 'Strain Map' }
];

export function UploadModule({ onUploadComplete, isProcessing }: UploadModuleProps) {
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [unitsInspected, setUnitsInspected] = useState<number>(100);
  const [category, setCategory] = useState<string>("Shirt");

  const handleFileChange = (viewId: string, file: File) => {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [viewId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (viewId: string) => {
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[viewId];
      return newImages;
    });
  };

  const isAllUploaded = VIEW_TYPES.every(view => images[view.id]);

  const handleSubmit = () => {
    if (isAllUploaded) {
      // Send image data in the order of VIEW_TYPES
      const orderedImages = VIEW_TYPES.map(vt => images[vt.id]);
      onUploadComplete(orderedImages, unitsInspected, category);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/5">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            Upload Garment Images
          </CardTitle>
          <CardDescription>
            Please provide the Render Image and the 4 Simulation Maps for analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIEW_TYPES.map((view) => (
              <div key={view.id} className="relative group">
                <div 
                  className={`
                    aspect-video rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden
                    ${images[view.id] ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 bg-background'}
                  `}
                >
                  {images[view.id] ? (
                    <>
                      <img 
                        src={images[view.id]} 
                        alt={view.label} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={() => removeImage(view.id)}
                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs font-medium backdrop-blur-sm">
                        {view.label}
                      </div>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                      <span className="text-sm font-medium text-muted-foreground">{view.label}</span>
                      <span className="text-xs text-muted-foreground/60 mt-1">Click to upload JPG/PNG</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(view.id, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
                {images[view.id] && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full p-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Garment Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select Garment Category" />
                </SelectTrigger>
                <SelectContent>
                  {GARMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Total Units Inspected in this Batch</Label>
              <input
                id="units"
                type="number"
                value={unitsInspected}
                onChange={(e) => setUnitsInspected(parseInt(e.target.value) || 0)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="mt-8">
            <Button 
              onClick={handleSubmit} 
              disabled={!isAllUploaded || isProcessing}
              className="w-full h-12 text-lg font-semibold"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Upload className="w-5 h-5" />
                  </motion.div>
                  Processing Analysis...
                </span>
              ) : (
                'Run AI Defect Analysis'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
