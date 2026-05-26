import { AlertTriangle, Loader2, Search } from "lucide-react";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

function SearchBar({ onSubmit, isScanning }) {
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const url = formData.get("url")?.toString().trim();

    if (!url) {
      setValidationError("Please enter a URL.");
      return;
    }

    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setValidationError("Enter a valid http or https URL.");
      return;
    }

    setValidationError("");
    onSubmit(url);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl" noValidate>
      <InputGroup className="h-12 bg-white/95 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <InputGroupInput
          name="url"
          type="text"
          placeholder="https://yourwebsite.com"
          className="px-4 text-base text-black placeholder:text-zinc-500"
          disabled={isScanning}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? "url-validation-error" : undefined}
          onChange={() => {
            if (validationError) {
              setValidationError("");
            }
          }}
        />

        <InputGroupAddon align="inline-end" className="pr-3">
          <button
            type="submit"
            className="flex size-8 items-center justify-center rounded-md text-black transition-colors hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isScanning}
            aria-label="Scan website"
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </InputGroupAddon>
      </InputGroup>

      {validationError ? (
        <div
          id="url-validation-error"
          className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-black/90 px-4 py-3 text-sm text-white shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          role="alert"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-black">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="whitespace-nowrap">{validationError}</span>
        </div>
      ) : null}
    </form>
  );
}

export default SearchBar;
