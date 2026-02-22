import { useEffect, useState } from 'react';
import { Upload, Trash2, FileText, File, Search, Tag } from 'lucide-react';
import GravityContainer from '../components/GravityContainer';
import Card from '../components/Card';
import { documentAPI } from '../utils/api';
import './Documents.css';

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        tags: '',
        file: null
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const response = await documentAPI.getAll();
            const data = response.data.data || response.data;
            setDocuments(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('file', formData.file);
            formDataToSend.append('title', formData.title);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim()).filter(t => t)));

            const response = await documentAPI.upload(formDataToSend);
            setShowForm(false);
            setFormData({
                title: '',
                category: '',
                tags: '',
                file: null
            });
            // Update local state without refetching
            setDocuments(prev => [...prev, response.data]);
        } catch (error) {
            console.error('Error uploading document:', error);
            const errorMsg = error.response?.data?.message || error.message || "Unknown error";
            alert(`Upload Failed: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentAPI.delete(id);
            // Update local state without refetching
            setDocuments(prev => prev.filter(doc => doc._id !== id));
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({
                ...formData,
                file: file,
                title: formData.title || file.name
            });
        }
    };

    const categories = ['Engineering', 'Academic', 'Personal', 'Work', 'Legal', 'Financial'];

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const kb = bytes / 1024;
        const mb = kb / 1024;
        return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
    };

    const getFileIcon = (mimeType) => {
        if (!mimeType) return <File size={40} />;
        if (mimeType.includes('pdf')) return <FileText size={40} style={{ color: '#ef4444' }} />;
        if (mimeType.includes('image')) return <FileText size={40} style={{ color: '#10b981' }} />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={40} style={{ color: '#00d4ff' }} />;
        return <File size={40} />;
    };

    const handleDocumentClick = (doc) => {
        if (doc.filepath) {
            // Check if it's an absolute URL (Cloudinary)
            if (doc.filepath.startsWith('http')) {
                window.open(doc.filepath, '_blank');
                return;
            }

            // Legacy local file handling
            const normalizedPath = doc.filepath.replace(/\\/g, '/');

            // Get base URL from environment or default
            const apiBase = import.meta.env.VITE_API_URL || 'https://routine-master.onrender.com/api';
            // Remove '/api' from the end to get the server root
            const serverBase = apiBase.replace(/\/api$/, '');

            window.open(`${serverBase}/${normalizedPath}`, '_blank');
        }
    };

    return (
        <div className="documents-page">
            <div className="page-header">
                <h1 className="module-title text-gradient">Document Storage</h1>
            </div>

            <button className="btn btn-primary add-button" onClick={() => setShowForm(!showForm)}>
                <Upload size={20} />
                Upload Document
            </button>

            <div className="documents-controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="category-filter">
                    <button
                        className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {showForm && (
                <Card className="document-form">
                    <h3>Upload New Document</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>File</label>
                            <div className="file-input-wrapper">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    required
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="file-input-label">
                                    <Upload size={20} />
                                    {formData.file ? formData.file.name : 'Choose file...'}
                                </label>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Document title"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Tags (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="e.g., important, exam, project"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            <GravityContainer className="documents-grid">
                {filteredDocuments.map((doc) => (
                    <Card
                        key={doc._id}
                        className="document-card"
                        onClick={() => handleDocumentClick(doc)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="document-header">
                            <div className="document-icon">
                                {getFileIcon(doc.mimeType)}
                            </div>
                            <button
                                className="delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(doc._id);
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <h4>{doc.title}</h4>
                        <div className="document-meta">
                            {doc.category && (
                                <span className="doc-category">{doc.category}</span>
                            )}
                            <span className="doc-size">{formatFileSize(doc.fileSize)}</span>
                        </div>
                        <div className="document-date">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                            <div className="document-tags">
                                {doc.tags.map((tag, index) => (
                                    <span key={index} className="tag">
                                        <Tag size={12} />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>
                ))}
            </GravityContainer>

            {filteredDocuments.length === 0 && !showForm && (
                <div className="empty-state">
                    <FileText size={64} className="text-gradient" />
                    <h3>{searchTerm || selectedCategory !== 'all' ? 'No documents found' : 'No documents yet'}</h3>
                    <p>{searchTerm || selectedCategory !== 'all' ? 'Try adjusting your search or filters' : 'Upload your first document to get started'}</p>
                </div>
            )}
        </div>
    );
}
