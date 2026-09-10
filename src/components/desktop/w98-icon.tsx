import Image from "next/image";
import { iconPath, type W98IconName } from "@/lib/public-apps";

export function W98Icon({ icon, size = 16, alt = "", className }: { icon: W98IconName; size?: 16 | 32; alt?: string; className?: string }) {
  return (
    <Image
      alt={alt}
      className={`w98-icon${className ? ` ${className}` : ""}`}
      draggable={false}
      height={size}
      src={iconPath(icon, size)}
      unoptimized
      width={size}
    />
  );
}

