import "./styles.css";

export const metadata = {
  title: "Tartan Tickets",
  description: "Student club events, all in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
