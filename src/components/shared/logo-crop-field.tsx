"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const CROP_SIZE = 512;

export type LogoCropStatus = "editing" | "empty" | "error" | "ready";

type DragState = Readonly<{
  clientX: number;
  clientY: number;
  pointerId: number;
  positionX: number;
  positionY: number;
}>;

function clamp(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function croppedFilename(filename: string) {
  const stem = filename.replace(/\.[^.]+$/, "").slice(0, 80) || "logo";
  return `${stem}-cropped.png`;
}

export function LogoCropField({
  ariaInvalid = false,
  disabled = false,
  helpId,
  label = "Logo image",
  name,
  onFileReady,
  onStatusChange,
  required = false,
}: {
  ariaInvalid?: boolean;
  disabled?: boolean;
  helpId?: string;
  label?: string;
  name?: string;
  onFileReady?: (file: File | null) => void;
  onStatusChange?: (status: LogoCropStatus) => void;
  required?: boolean;
}) {
  const generatedId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    height: number;
    width: number;
  } | null>(null);
  const [filename, setFilename] = useState("");
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [status, setStatus] = useState<LogoCropStatus>("empty");
  const [zoom, setZoom] = useState(1);

  const updateStatus = useCallback(
    (nextStatus: LogoCropStatus) => {
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
    },
    [onStatusChange],
  );

  const markEditing = useCallback(() => {
    onFileReady?.(null);
    updateStatus("editing");
  }, [onFileReady, updateStatus]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !dimensions) return;
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale =
      Math.max(CROP_SIZE / dimensions.width, CROP_SIZE / dimensions.height) *
      zoom;
    const renderedWidth = dimensions.width * scale;
    const renderedHeight = dimensions.height * scale;
    const overflowX = Math.max(0, renderedWidth - CROP_SIZE);
    const overflowY = Math.max(0, renderedHeight - CROP_SIZE);
    const destinationX =
      (CROP_SIZE - renderedWidth) / 2 + positionX * (overflowX / 2);
    const destinationY =
      (CROP_SIZE - renderedHeight) / 2 + positionY * (overflowY / 2);

    context.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      destinationX,
      destinationY,
      renderedWidth,
      renderedHeight,
    );
  }, [dimensions, positionX, positionY, zoom]);

  function clearSelection() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    imageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDimensions(null);
    setFilename("");
    setPositionX(0);
    setPositionY(0);
    setZoom(1);
    onFileReady?.(null);
    updateStatus("empty");
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dimensions || disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      positionX,
      positionY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !dimensions || drag.pointerId !== event.pointerId)
      return;
    const rect = canvas.getBoundingClientRect();
    const baseScale =
      Math.max(CROP_SIZE / dimensions.width, CROP_SIZE / dimensions.height) *
      zoom;
    const overflowX = Math.max(
      0,
      (dimensions.width * baseScale - CROP_SIZE) * (rect.width / CROP_SIZE),
    );
    const overflowY = Math.max(
      0,
      (dimensions.height * baseScale - CROP_SIZE) * (rect.height / CROP_SIZE),
    );
    setPositionX(
      overflowX
        ? clamp(
            drag.positionX + (event.clientX - drag.clientX) / (overflowX / 2),
          )
        : 0,
    );
    setPositionY(
      overflowY
        ? clamp(
            drag.positionY + (event.clientY - drag.clientY) / (overflowY / 2),
          )
        : 0,
    );
    markEditing();
  }

  function finishPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <div className="logo-crop-field">
      <label htmlFor={`${generatedId}-file`}>
        {label}
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={helpId}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          id={`${generatedId}-file`}
          name={status === "ready" ? name : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return clearSelection();
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            const objectUrl = URL.createObjectURL(file);
            objectUrlRef.current = objectUrl;
            setFilename(file.name);
            setPositionX(0);
            setPositionY(0);
            setZoom(1);
            onFileReady?.(null);
            updateStatus("editing");
            const image = new window.Image();
            image.onload = () => {
              imageRef.current = image;
              setDimensions({
                height: image.naturalHeight,
                width: image.naturalWidth,
              });
            };
            image.onerror = () => {
              imageRef.current = null;
              setDimensions(null);
              updateStatus("error");
            };
            image.src = objectUrl;
          }}
          ref={fileInputRef}
          required={required}
          type="file"
        />
      </label>

      {dimensions ? (
        <div className="logo-crop-editor">
          <canvas
            aria-label="Square logo crop preview"
            className="logo-crop-canvas"
            onPointerCancel={finishPointer}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            ref={canvasRef}
            role="img"
          />
          <div className="logo-crop-controls">
            <label>
              Zoom
              <input
                aria-label="Logo crop zoom"
                disabled={disabled}
                max="3"
                min="1"
                onChange={(event) => {
                  setZoom(Number(event.target.value));
                  markEditing();
                }}
                step="0.05"
                type="range"
                value={zoom}
              />
            </label>
            <label>
              Move left or right
              <input
                aria-label="Logo crop horizontal position"
                disabled={disabled}
                max="1"
                min="-1"
                onChange={(event) => {
                  setPositionX(Number(event.target.value));
                  markEditing();
                }}
                step="0.01"
                type="range"
                value={positionX}
              />
            </label>
            <label>
              Move up or down
              <input
                aria-label="Logo crop vertical position"
                disabled={disabled}
                max="1"
                min="-1"
                onChange={(event) => {
                  setPositionY(Number(event.target.value));
                  markEditing();
                }}
                step="0.01"
                type="range"
                value={positionY}
              />
            </label>
          </div>
          <p className="field-help logo-crop-help">
            Drag the preview or use the controls. Everything inside the square
            will become your logo.
          </p>
          <div className="logo-crop-actions">
            <button
              className="button button-secondary"
              disabled={disabled}
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return updateStatus("error");
                canvas.toBlob((blob) => {
                  if (!blob || !fileInputRef.current)
                    return updateStatus("error");
                  const croppedFile = new File(
                    [blob],
                    croppedFilename(filename),
                    { type: "image/png" },
                  );
                  const transfer = new DataTransfer();
                  transfer.items.add(croppedFile);
                  fileInputRef.current.files = transfer.files;
                  onFileReady?.(croppedFile);
                  updateStatus("ready");
                }, "image/png");
              }}
              type="button"
            >
              Use this crop
            </button>
            <button
              className="button button-quiet"
              disabled={disabled}
              onClick={clearSelection}
              type="button"
            >
              Remove logo
            </button>
          </div>
          <p
            className={`logo-crop-status ${status === "ready" ? "logo-crop-ready" : ""}`}
            role="status"
          >
            {status === "ready"
              ? "Crop ready to upload."
              : "Select “Use this crop” when it looks right."}
          </p>
        </div>
      ) : status === "error" ? (
        <p className="field-error" role="alert">
          That image could not be previewed. Choose another JPEG, PNG or WebP.
        </p>
      ) : null}
    </div>
  );
}
