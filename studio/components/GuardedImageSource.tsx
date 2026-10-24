import { useEffect, useState } from "react";
import { useClient, type AssetSourceComponentProps } from "sanity";
import {
  mediaAccept,
  mediaLimits,
  uploadError,
  type MediaKind,
} from "../lib/mediaRules.ts";

export default function ImagePicker({
  kind,
  onSelect,
  onClose,
}: AssetSourceComponentProps & { kind: MediaKind }) {
  const client = useClient({ apiVersion: "2026-09-08" });
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<
    Array<{ _id: string; originalFilename?: string }>
  >([]);
  useEffect(() => {
    let active = true;
    client
      .fetch(
        '*[_type == "sanity.imageAsset" && size <= $limit && mimeType in $types] | order(_createdAt desc)[0...100]{_id, originalFilename}',
        {
          limit: mediaLimits[kind],
          types: mediaAccept[kind].split(","),
        },
      )
      .then((result) => {
        if (active) setAssets(result);
      })
      .catch(() => {
        if (active) setError("Existing images could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [client, kind]);
  function selectFile(file?: File) {
    if (!file) return;
    const result = uploadError(file, kind);
    if (result !== true) {
      setError(result);
      return;
    }
    onSelect([
      {
        kind: "file",
        value: file as unknown as Parameters<
          typeof onSelect
        >[0][number]["value"],
      },
    ]);
  }
  return (
    <section
      aria-label={`Choose ${kind}`}
      style={{ padding: 24 }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        selectFile(event.dataTransfer.files[0]);
      }}
      onPaste={(event) => {
        if (event.clipboardData.files.length) {
          event.preventDefault();
          event.stopPropagation();
          selectFile(event.clipboardData.files[0]);
        }
      }}
    >
      <label>
        Upload {kind} (
        {kind === "portrait" ? "2 MiB maximum" : "250 KiB maximum"})
        <input
          type="file"
          accept={mediaAccept[kind]}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <ul>
        {assets.map((asset) => (
          <li key={asset._id}>
            <button
              type="button"
              onClick={() =>
                onSelect([{ kind: "assetDocumentId", value: asset._id }])
              }
            >
              {asset.originalFilename || "Existing image"}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </section>
  );
}
