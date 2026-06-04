import { useEffect, useState } from "react";

export function useOnboarding(key: string) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(key);
    if (!seen) {
      setShow(true);
    }
  }, [key]);

  function dismiss() {
    localStorage.setItem(key, "1");
    setShow(false);
  }

  return { show, dismiss };
}