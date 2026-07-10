import "./globals.css";

export const metadata = {
  title: "OhmyNews Naver Trend",
  description: "Internal editorial dashboard for OhmyNews mobile-front Naver view trends"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
