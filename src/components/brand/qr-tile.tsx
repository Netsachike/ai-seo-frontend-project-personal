import { QRCodeSVG } from "qrcode.react";

/**
 * Always dark-on-light in both themes so phones can scan it. The `qr-*`
 * tokens are the only colors that don't change with the theme.
 */
export function QrTile({ value, size = 148, label }: { value: string; size?: number; label: string }) {
  return (
    <div className="inline-grid shrink-0 place-items-center rounded-lg border border-border bg-qr-bg p-3 text-qr-fg">
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="transparent"
        fgColor="currentColor"
        level="M"
        role="img"
        aria-label={label}
      />
    </div>
  );
}
