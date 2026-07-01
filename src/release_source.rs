pub(crate) const RELEASE_REPOSITORY: &str = "kingkillery/pk-herdr";
pub(crate) const STABLE_UPDATE_MANIFEST_URL: &str = "https://herdr.pkking.computer/latest.json";
pub(crate) const PREVIEW_UPDATE_MANIFEST_URL: &str = "https://herdr.pkking.computer/preview.json";
pub(crate) const WINDOWS_INSTALL_SCRIPT_COMMAND: &str =
    "irm https://herdr.pkking.computer/install.ps1 | iex";

const RELEASE_DOWNLOAD_URL_PREFIX: &str =
    "https://github.com/kingkillery/pk-herdr/releases/download/";

pub(crate) fn validate_release_asset_url(url: &str) -> Result<(), String> {
    let url = url.trim();
    if url.starts_with(RELEASE_DOWNLOAD_URL_PREFIX) {
        return Ok(());
    }

    Err(format!(
        "release asset URL must come from {RELEASE_REPOSITORY}: {url}"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_fork_release_asset_urls() {
        assert!(validate_release_asset_url(
            "https://github.com/kingkillery/pk-herdr/releases/download/v0.7.1/herdr-linux-x86_64"
        )
        .is_ok());
    }

    #[test]
    fn rejects_original_upstream_release_asset_urls() {
        let err = validate_release_asset_url(
            "https://github.com/ogulcancelik/herdr/releases/download/v0.7.1/herdr-linux-x86_64",
        )
        .expect_err("original upstream assets are rejected");

        assert!(err.contains(RELEASE_REPOSITORY));
    }
}
