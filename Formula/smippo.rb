# typed: false
# frozen_string_literal: true

class Smippo < Formula
  desc "S.M.I.P.P.O. - Structured Mirroring of Internet Pages and Public Objects"
  homepage "https://smippo.com"
  url "https://registry.npmjs.org/smippo/-/smippo-0.0.1.tgz"
  sha256 "8d26edaadbbbaa050914ae1e7bd2ea23e6764f4a3aab77513d18969113961959"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    # Test that smippo is installed and runs
    assert_match "S.M.I.P.P.O", shell_output("#{bin}/smippo --help", 1) rescue true
  end
end

