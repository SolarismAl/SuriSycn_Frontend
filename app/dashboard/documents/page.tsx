"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Upload,
  Folder,
  MoreVertical,
  Download,
  Trash2,
  FileIcon,
  Image as ImageIcon,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Edit2,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { api, getAppUrl } from "@/lib/axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

interface DocumentItem {
  id: string;
  name: string;
  type: "folder" | "pdf" | "image" | "sheet" | "doc" | "other";
  size?: number | null;
  date: string;
  owner_name: string;
  url?: string;
  parent_id: string | null;
}

export default function DocumentsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string, name: string }[]>([]);
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [loading, setLoading] = useState(true);

  // Modals state
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [renameOpen, setRenameOpen] = useState(false);
  const [docToRename, setDocToRename] = useState<DocumentItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin" && user.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [user, isAuthenticated, router]);

  const fetchDocuments = async (parentId: string | null = null) => {
    setLoading(true);
    try {
      const res = await api.get("/documents", { params: { parent_id: parentId } });
      if (res.data?.status === "success") {
        setDocuments(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "manager") {
      fetchDocuments(currentFolderId);
    }
  }, [currentFolderId, user]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setIsSubmittingFolder(true);
      await api.post("/documents", {
        is_folder: true,
        name: newFolderName.trim(),
        parent_id: currentFolderId
      });
      toast.success("Folder created");
      setNewFolderOpen(false);
      setNewFolderName("");
      fetchDocuments(currentFolderId);
    } catch (err) {
      toast.error("Failed to create folder");
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    try {
      toast.info("Uploading file...");
      
      // Convert to Base64 to bypass PHP built-in server multipart bug on Windows
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = reader.result;
        
        try {
          await api.post("/documents", {
            is_folder: false,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_data: base64Data,
            parent_id: currentFolderId || null
          });
          toast.success("File uploaded successfully");
          fetchDocuments(currentFolderId);
        } catch (err) {
          toast.error("Failed to upload file");
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      
      reader.onerror = () => {
        toast.error("Failed to read file");
        if (fileInputRef.current) fileInputRef.current.value = "";
      };
    } catch (err) {
      toast.error("Failed to process file");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("Deleted successfully");
      fetchDocuments(currentFolderId);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleRename = async () => {
    if (!docToRename || !renameValue.trim()) return;
    try {
      setIsSubmittingRename(true);
      await api.put(`/documents/${docToRename.id}`, { name: renameValue.trim() });
      toast.success("Renamed successfully");
      setRenameOpen(false);
      setDocToRename(null);
      fetchDocuments(currentFolderId);
    } catch (err) {
      toast.error("Failed to rename");
    } finally {
      setIsSubmittingRename(false);
    }
  };

  const openRenameModal = (doc: DocumentItem) => {
    setDocToRename(doc);
    setRenameValue(doc.name);
    setRenameOpen(true);
  };

  const enterFolder = (folder: DocumentItem) => {
    setFolderHistory([...folderHistory, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const goBack = () => {
    if (folderHistory.length === 0) return;
    const newHistory = [...folderHistory];
    newHistory.pop();
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null);
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getIcon = (type: DocumentItem["type"]) => {
    switch (type) {
      case "folder": return <Folder className="w-8 h-8 text-blue-500 fill-blue-500/20" />;
      case "pdf": return <FileIcon className="w-8 h-8 text-red-500" />;
      case "sheet": return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case "image": return <ImageIcon className="w-8 h-8 text-purple-500" />;
      default: return <FileText className="w-8 h-8 text-blue-500" />;
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const folders = filteredDocs.filter((d) => d.type === "folder");
  const files = filteredDocs.filter((d) => d.type !== "folder");

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return null;
  }

  const currentFolderName = folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : "Root";

  return (
    <div className="flex flex-col gap-6 w-full h-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {folderHistory.length > 0 && (
            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 shrink-0 h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-3xl font-semibold tracking-tight"
            >
              Documents {folderHistory.length > 0 && <span className="text-muted-foreground font-normal text-xl ml-2">/ {currentFolderName}</span>}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-muted-foreground"
            >
              Securely store and manage city department files.
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <Button variant="outline" onClick={() => setNewFolderOpen(true)} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            New Folder
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="p-4 border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-3xl shadow-sm rounded-2xl flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 rounded-xl h-10"
            />
          </div>
          <div className="flex gap-2 items-center overflow-x-auto">
            <Badge onClick={() => setFilterType("all")} variant={filterType === "all" ? "default" : "secondary"} className="rounded-lg cursor-pointer px-3 py-1 text-sm font-medium">All</Badge>
            <Badge onClick={() => setFilterType("pdf")} variant={filterType === "pdf" ? "default" : "outline"} className="rounded-lg cursor-pointer px-3 py-1 text-sm font-medium">PDFs</Badge>
            <Badge onClick={() => setFilterType("sheet")} variant={filterType === "sheet" ? "default" : "outline"} className="rounded-lg cursor-pointer px-3 py-1 text-sm font-medium">Sheets</Badge>
            <Badge onClick={() => setFilterType("image")} variant={filterType === "image" ? "default" : "outline"} className="rounded-lg cursor-pointer px-3 py-1 text-sm font-medium">Images</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Content */}
      <div className="flex flex-col gap-8">
        {loading && (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && folders.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map((folder, i) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    onDoubleClick={() => enterFolder(folder)}
                    className="p-4 border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-3xl shadow-sm rounded-2xl hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 truncate pr-2 flex-1" onClick={() => enterFolder(folder)}>
                      <div className="shrink-0">{getIcon("folder")}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate" title={folder.name}>{folder.name}</p>
                        <p className="text-xs text-muted-foreground">{folder.date}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/5 outline-none">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem onClick={() => enterFolder(folder)} className="rounded-lg text-xs cursor-pointer">Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openRenameModal(folder)} className="rounded-lg text-xs cursor-pointer gap-2"><Edit2 className="w-3.5 h-3.5"/> Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(folder.id, folder.name)} className="rounded-lg text-xs cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {files.map((file, i) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <Card className="p-4 border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-3xl shadow-sm rounded-2xl hover:shadow-md transition-all group flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        {getIcon(file.type)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/5 outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          {file.url && (
                            <DropdownMenuItem onClick={() => window.open(getAppUrl() + file.url, '_blank')} className="rounded-lg text-xs cursor-pointer gap-2">
                              <Download className="w-3.5 h-3.5" /> Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openRenameModal(file)} className="rounded-lg text-xs cursor-pointer gap-2">
                            <Edit2 className="w-3.5 h-3.5"/> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(file.id, file.name)} className="rounded-lg text-xs cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div>
                      <p className="font-semibold text-sm truncate" title={file.name}>{file.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.date}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium truncate">{file.owner_name}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredDocs.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p>No documents found {search ? `matching "${search}"` : "in this folder"}</p>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)} disabled={isSubmittingFolder}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={isSubmittingFolder} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingFolder ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename {docToRename?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>Enter a new name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              placeholder="New name..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={isSubmittingRename}>Cancel</Button>
            <Button onClick={handleRename} disabled={isSubmittingRename} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmittingRename ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Renaming...</>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
