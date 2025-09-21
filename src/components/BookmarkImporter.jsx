import { useState, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Upload,
  FileText,
  Folder,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Package,
  FileWarning,
  Info
} from 'lucide-react';
import {
  previewBookmarks,
  importFilteredBookmarks,
  analyzeDuplicates,
  mergeDuplicateLinks
} from '../../scripts/import-bookmarks.js';

const BookmarkImporter = ({ onImport, existingLinks = [], onClose }) => {
  const [stage, setStage] = useState('upload'); // upload, preview, confirm, importing, complete
  const [fileContent, setFileContent] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [importStats, setImportStats] = useState(null);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showWarnings, setShowWarnings] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Please upload an HTML bookmark file (exported from your browser)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        setFileContent(content);
        
        // Generate preview
        const bookmarkPreview = previewBookmarks(content);
        setPreview(bookmarkPreview);
        
        // Pre-select suggested folders
        const preSelected = new Set(bookmarkPreview.suggestedSelections);
        setSelectedFolders(preSelected);
        
        setStage('preview');
        setError(null);
      } catch (err) {
        setError('Failed to parse bookmark file: ' + err.message);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
    };
    
    reader.readAsText(file);
  }, []);

  // Toggle folder selection
  const toggleFolder = useCallback((folderPath) => {
    setSelectedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);

  // Toggle all folders
  const toggleAllFolders = useCallback((select) => {
    if (select) {
      // Select all non-warning folders
      const allPaths = Object.entries(preview.folders)
        .filter(([, folder]) => !folder.hasPrivateUrls)
        .map(([path]) => path);
      setSelectedFolders(new Set(allPaths));
    } else {
      setSelectedFolders(new Set());
    }
  }, [preview]);

  // Process import
  const handleImport = useCallback(async () => {
    if (!fileContent || selectedFolders.size === 0) return;
    
    setStage('importing');
    
    try {
      // Import selected bookmarks
      const newLinks = importFilteredBookmarks(
        fileContent,
        Array.from(selectedFolders),
        { excludePrivateUrls: true, maxBatchSize: 5000 }
      );
      
      // Analyze duplicates
      const analysis = analyzeDuplicates(newLinks, existingLinks);
      
      // Merge or add links
      let finalLinks;
      if (analysis.duplicateCount > 0) {
        finalLinks = mergeDuplicateLinks(newLinks, existingLinks);
      } else {
        finalLinks = [...existingLinks, ...newLinks];
      }
      
      // Update stats
      setImportStats({
        imported: analysis.uniqueCount,
        duplicates: analysis.duplicateCount,
        total: newLinks.length,
        folders: selectedFolders.size
      });
      
      // Trigger import callback
      onImport(finalLinks);
      setStage('complete');
      
    } catch (err) {
      setError('Import failed: ' + err.message);
      setStage('preview');
    }
  }, [fileContent, selectedFolders, existingLinks, onImport]);

  // Calculate selected link count
  const getSelectedCount = () => {
    if (!preview) return 0;
    return Array.from(selectedFolders).reduce((total, path) => {
      const folder = preview.folders[path];
      return total + (folder ? folder.count : 0);
    }, 0);
  };

  // Render folder tree item
  const renderFolderItem = (path, folder) => {
    const isSelected = selectedFolders.has(path);
    const isExpanded = expandedFolders.has(path);
    const hasSubfolders = Object.keys(preview.folders).some(p => 
      p.startsWith(path + '/') && p !== path
    );
    
    return (
      <div key={path} className="border-l-2 border-gray-200 dark:border-gray-700 ml-2">
        <div className={`
          flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        `}>
          {hasSubfolders && (
            <button
              onClick={() => {
                setExpandedFolders(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(path)) {
                    newSet.delete(path);
                  } else {
                    newSet.add(path);
                  }
                  return newSet;
                });
              }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleFolder(path)}
            className="rounded border-gray-300"
          />
          
          <Folder className={`w-4 h-4 ${folder.isLikelyPublic ? 'text-green-600' : 'text-gray-500'}`} />
          
          <span className="flex-1 text-sm">
            {folder.name}
            <span className="ml-2 text-xs text-gray-500">({folder.count})</span>
          </span>
          
          {folder.hasPrivateUrls && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" title="Contains local/internal URLs" />
          )}
          
          {folder.isLikelyPublic && (
            <Check className="w-4 h-4 text-green-500" title="Likely public content" />
          )}
        </div>
        
        {isExpanded && hasSubfolders && (
          <div className="ml-4">
            {Object.entries(preview.folders)
              .filter(([p]) => {
                const depth = p.split('/').length;
                const parentDepth = path.split('/').length;
                return p.startsWith(path + '/') && depth === parentDepth + 1;
              })
              .map(([subPath, subFolder]) => renderFolderItem(subPath, subFolder))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Bookmarks
            </h2>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Upload Stage */}
          {stage === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="font-medium mb-2">Upload Bookmark File</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Export bookmarks from your browser as HTML and upload here
                </p>
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bookmark-upload"
                />
                <label htmlFor="bookmark-upload">
                  <Button as="span" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  How to export bookmarks
                </h4>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• <strong>Chrome/Edge:</strong> Bookmarks → Bookmark Manager → ⋮ → Export bookmarks</li>
                  <li>• <strong>Firefox:</strong> Bookmarks → Show All Bookmarks → Import and Backup → Export Bookmarks to HTML</li>
                  <li>• <strong>Safari:</strong> File → Export → Bookmarks</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview Stage */}
          {stage === 'preview' && preview && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Select Folders to Import</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleAllFolders(true)}
                    >
                      Select All Safe
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleAllFolders(false)}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose which folders to import. Folders with public content are pre-selected.
                </p>
              </div>

              {preview.warningFolders.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <button
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400"
                  >
                    <FileWarning className="w-4 h-4" />
                    {preview.warningFolders.length} folders contain private URLs
                    {showWarnings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {showWarnings && (
                    <ul className="mt-2 text-xs space-y-1">
                      {preview.warningFolders.map(warning => (
                        <li key={warning.path}>
                          {warning.path}: {warning.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.entries(preview.folders)
                  .filter(([path]) => !path.includes('/'))
                  .map(([path, folder]) => renderFolderItem(path, folder))}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium">{getSelectedCount()}</span> links selected from{' '}
                  <span className="font-medium">{selectedFolders.size}</span> folders
                  {' '}(Total: {preview.totalCount} links)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStage('upload')}>
                    Back
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={selectedFolders.size === 0}
                  >
                    Import Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Importing Stage */}
          {stage === 'importing' && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
              <h3 className="font-medium mb-2">Importing Bookmarks...</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processing {getSelectedCount()} links from {selectedFolders.size} folders
              </p>
            </div>
          )}

          {/* Complete Stage */}
          {stage === 'complete' && importStats && (
            <div className="text-center py-12">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-medium mb-4">Import Complete!</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-4">
                  <span><strong>{importStats.imported}</strong> new links imported</span>
                  {importStats.duplicates > 0 && (
                    <span><strong>{importStats.duplicates}</strong> duplicates merged</span>
                  )}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  From {importStats.folders} folders
                </div>
              </div>
              <Button onClick={onClose} className="mt-6">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookmarkImporter;