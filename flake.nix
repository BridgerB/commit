{
  description = "A simple flake for the commit tool";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      packages = {
        fmt = pkgs.writeShellApplication {
          name = "fmt";
          runtimeInputs = [pkgs.nix];
          text = ''
            exec nix run github:BridgerB/fmt
          '';
        };
        fmt-check = pkgs.writeShellApplication {
          name = "fmt-check";
          runtimeInputs = [pkgs.nix];
          text = ''
            exec nix run github:BridgerB/fmt -- --check
          '';
        };
        check = pkgs.writeShellApplication {
          name = "check";
          runtimeInputs = [pkgs.deno];
          text = ''
            exec deno check
          '';
        };
        lint = pkgs.writeShellApplication {
          name = "lint";
          runtimeInputs = [pkgs.deno];
          text = ''
            exec deno lint
          '';
        };
        commit = pkgs.stdenv.mkDerivation {
          name = "commit";
          src = ./.;
          buildInputs = [pkgs.makeWrapper];
          nativeBuildInputs = [pkgs.deno];
          installPhase = ''
            mkdir -p $out/libexec/commit
            cp -r * $out/libexec/commit/
            mkdir -p $out/bin
            makeWrapper ${pkgs.deno}/bin/deno $out/bin/commit \
              --add-flags "run --allow-run $out/libexec/commit/main.ts"
          '';
        };
        test = pkgs.writeShellApplication {
          name = "test";
          runtimeInputs = [pkgs.deno];
          text = ''
            exec deno test
          '';
        };
        build = pkgs.writeShellApplication {
          name = "build";
          runtimeInputs = [pkgs.deno];
          text = ''
            exec deno compile main.ts
          '';
        };
      };

      apps = {
        default = {
          type = "app";
          program = "${self.packages.${system}.commit}/bin/commit";
        };
        commit = {
          type = "app";
          program = "${self.packages.${system}.commit}/bin/commit";
        };
        fmt = {
          type = "app";
          program = "${self.packages.${system}.fmt}/bin/fmt";
        };
        fmt-check = {
          type = "app";
          program = "${self.packages.${system}.fmt-check}/bin/fmt-check";
        };
        check = {
          type = "app";
          program = "${self.packages.${system}.check}/bin/check";
        };
        lint = {
          type = "app";
          program = "${self.packages.${system}.lint}/bin/lint";
        };
        test = {
          type = "app";
          program = "${self.packages.${system}.test}/bin/test";
        };
        build = {
          type = "app";
          program = "${self.packages.${system}.build}/bin/build";
        };
      };
    });
}
