{
  description = "ごみの日 - ごみ収集カレンダー PWA";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Playwright が使う Chromium をNixで管理
        playwrightBrowsers = pkgs.playwright-driver.browsers;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            # アイコン生成
            imagemagick
            # Git（CI/CD用）
            git
          ];

          # Playwright: Nixのブラウザを指す・ダウンロードをスキップ
          env = {
            PLAYWRIGHT_BROWSERS_PATH = playwrightBrowsers;
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          };

          # Chromiumが必要とするシステムライブラリをLD_LIBRARY_PATHに追加
          shellHook = ''
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath (with pkgs; [
              glib
              nss
              nspr
              at-spi2-atk
              at-spi2-core
              cups
              dbus
              libdrm
              gtk3
              pango
              cairo
              libx11
              libxcomposite
              libxdamage
              libxext
              libxfixes
              libxrandr
              libxcb
              mesa
              expat
              libxkbcommon
              alsa-lib
            ])}:''${LD_LIBRARY_PATH:-}"

            echo "🗑️  ごみの日 開発環境"
            echo "   Node.js: $(node --version)"
            echo "   npm:     $(npm --version)"
            echo "   Playwright browsers: $PLAYWRIGHT_BROWSERS_PATH"
          '';
        };
      }
    );
}
