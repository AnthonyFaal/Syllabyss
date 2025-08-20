import React, { useEffect } from "react";
import "./Modal.css";

const Modal = ({
  isOpen,
  onClose,
  children,
  variant = "center", // 'center' | 'side-right' | 'side-left' | 'bottom'
  width,
  height,
  showOverlay = true
}) => {

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <>
      {showOverlay && <div className="modal-overlay" onClick={onClose}></div>}

      <div
        className={`modal-container ${variant} ${isOpen ? "open" : ""}`}
        style={style}
      >
        <div className="modal-content">
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
          {children}
        </div>
      </div>
    </>
  );
};

export default Modal;
