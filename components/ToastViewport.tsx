"use client";

import { Toaster } from "react-hot-toast";

const ToastViewport = () => (
  <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
);

export default ToastViewport;
