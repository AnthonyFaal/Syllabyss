import { useState } from "react";
import { FaLightbulb, FaPlus, FaVideo, FaFileAlt, FaQuestionCircle, FaTrashAlt, FaEdit } from "react-icons/fa";
import './ContentStudio.css';

const ContentStudio = () => {
  const [activeTab, setActiveTab] = useState("myContent");
  const [contentList, setContentList] = useState([
    { id: 1, title: "Introduction to AI", type: "Video Lesson", createdAt: "2 days ago", icon: <FaVideo /> },
    { id: 2, title: "React Hooks Guide", type: "Document", createdAt: "1 week ago", icon: <FaFileAlt /> },
  ]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredContent = contentList.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteContent = (id) => {
    setContentList(contentList.filter(item => item.id !== id));
  };

  const handleEditContent = (id) => {
    alert(`Editing content with ID: ${id}`); // This can open a modal or a separate page for editing content.
  };

  return (
    <div className="content-studio">
      <div className="studio-header">
        <h1><FaLightbulb /> Content Studio</h1>
        <button className="create-btn">
          <FaPlus /> Create New
        </button>
      </div>
      
      <div className="studio-tabs">
        <button
          className={activeTab === "myContent" ? "active" : ""}
          onClick={() => setActiveTab("myContent")}
        >
          My Content
        </button>
        <button
          className={activeTab === "aiGenerate" ? "active" : ""}
          onClick={() => setActiveTab("aiGenerate")}
        >
          AI Generator
        </button>
        <button
          className={activeTab === "templates" ? "active" : ""}
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </button>
      </div>

      <div className="studio-content">
        {/* My Content Tab */}
        {activeTab === "myContent" && (
          <div className="content-list">
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-bar"
            />
            {filteredContent.map(item => (
              <div className="content-item" key={item.id}>
                <div className="content-icon">
                  {item.icon}
                </div>
                <div className="content-info">
                  <h3>{item.title}</h3>
                  <p>{item.type} • Created {item.createdAt}</p>
                </div>
                <div className="content-actions">
                  <button onClick={() => handleEditContent(item.id)}><FaEdit /></button>
                  <button onClick={() => handleDeleteContent(item.id)}><FaTrashAlt /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Generator Tab */}
        {activeTab === "aiGenerate" && (
          <div className="ai-generator">
            <div className="ai-prompt">
              <textarea placeholder="Describe the content you want to generate..."></textarea>
              <button>Generate with AI</button>
            </div>
            <div className="ai-options">
              <h3>Quick Generate</h3>
              <div className="option-buttons">
                <button><FaQuestionCircle /> Quiz</button>
                <button><FaFileAlt /> Summary</button>
                <button><FaVideo /> Micro-lesson</button>
                <button><FaFileAlt /> Blog Post</button>
                <button><FaVideo /> Tutorial</button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="templates">
            <h3>Content Templates</h3>
            <div className="template-list">
              <div className="template-item">
                <h4>Video Lesson</h4>
                <button>Use Template</button>
              </div>
              <div className="template-item">
                <h4>Document</h4>
                <button>Use Template</button>
              </div>
              <div className="template-item">
                <h4>Quiz</h4>
                <button>Use Template</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentStudio;
