'use client';

import { useState, useEffect } from 'react';

/**
 * Auto-detects ngrok and returns the public webhook URL.
 * Falls back to window.location.origin when ngrok isn't running.
 */
export default function useTunnel() {
  const [publicUrl, setPublicUrl] = useState('');
  const [isNgrok, setIsNgrok] = useState(false);

  useEffect(() => {
    fetch('/api/tunnel')
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          setPublicUrl(data.url);
          setIsNgrok(true);
        } else {
          setPublicUrl(window.location.origin);
        }
      })
      .catch(() => setPublicUrl(window.location.origin));
  }, []);

  return {
    publicUrl,
    webhookUrl: publicUrl ? `${publicUrl}/api/webhook` : '',
    isNgrok,
  };
}
