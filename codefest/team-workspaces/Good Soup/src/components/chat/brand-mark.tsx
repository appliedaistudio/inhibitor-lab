type BrandMarkProps = {
  variant?: "wordmark" | "avatar" | "veritas";
  className?: string;
  alt?: string;
};

export function BrandMark({
  variant = "wordmark",
  className,
  alt
}: BrandMarkProps) {
  const srcByVariant = {
    wordmark: "/brand/good-soup-mark.svg",
    avatar: "/brand/good-soup-avatar.svg",
    veritas: "/brand/veritas.png"
  } as const;

  const altByVariant = {
    wordmark: "Good Soup",
    avatar: "Good Soup avatar",
    veritas: "Veritas avatar"
  } as const;

  return <img alt={alt ?? altByVariant[variant]} className={className} src={srcByVariant[variant]} />;
}
