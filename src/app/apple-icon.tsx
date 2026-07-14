import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Next.js file-convention apple touch icon — wired into <head> automatically. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7D070",
          fontSize: 96,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "#FFFFFF",
            color: "#E98B75",
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          ♥
        </div>
      </div>
    ),
    { ...size }
  );
}
