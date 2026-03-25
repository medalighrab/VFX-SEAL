import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import "./index.css";

// SAFEGUARD: Prevent accidental contentEditable on critical elements
const preventEditableWrappers = () => {
  const criticalElements = [
    "body",
    "#root",
    "main",
    ".container",
    ".page-wrapper",
    ".hero-section",
  ];
  criticalElements.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      if (el && el.getAttribute("contenteditable")) {
        el.removeAttribute("contenteditable");
        console.warn(`Removed contenteditable from ${selector}`);
      }
    });
  });
};

// Run safeguard after DOM loads
document.addEventListener("DOMContentLoaded", preventEditableWrappers);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
