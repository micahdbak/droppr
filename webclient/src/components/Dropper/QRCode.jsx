import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

/**
 * @param {object} props
 * @param {string} props.url
 * @param {string} [props.logoUrl]
 */
export function DropperQRCode(props) {
  const { url, logoUrl } = props;
  const ref = useRef(null);
  const qrCode = useRef(null);

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: 80,
      height: 80,
      type: "svg",
      data: url,
      image: logoUrl,
      dotsOptions: { color: "#000000", type: "rounded" },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { crossOrigin: "anonymous", margin: 1, imageSize: 0.4 },
      qrOptions: { errorCorrectionLevel: "H" },
    });

    if (ref.current) {
      ref.current.innerHTML = "";
      qrCode.current.append(ref.current);
    }
  }, []);

  useEffect(() => {
    if (!qrCode.current) return;
    qrCode.current.update({ data: url, image: logoUrl });
  }, [url, logoUrl]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={ref} />
    </div>
  );
}
