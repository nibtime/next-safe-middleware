import { useEffect, useState } from "react";
import 'twin.macro'

const Hydrated = () => {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return (
    <>
      {!hydrated ? (
        <p tw="text-red-700">
          If you see me the page hasn't hydrated and is not interactive...
        </p>
      ) : (
        <p tw="text-green-700">
          If you see me the page has hydrated and is interactive...
        </p>
      )}
    </>
  );
};

export default Hydrated;
