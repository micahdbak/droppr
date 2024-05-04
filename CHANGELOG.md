# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- FileContainer and FileItem into FileTable and FileRow (#32).

## [0.2.0] - 2024-04-14

### Added

- SignalChannel and Peer models for client.
- Dropper and Recipient models for client.
- FileStore model for client.
- FileStream model for client.
- Multiple file dropping and receiving for client.
- Reworked user interface using new models for client.
- FileContainer and FileItem components for client.
- Drop and Receive pages for client.

### Changed

- Signal channel to identify drops with UUIDs.

## [0.1.0] - 2024-03-23

### Added

- The initial structure of droppr, as created during the Mountain Madness 2024 hackathon.

[unreleased]: https://github.com/micahdbak/droppr/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/micahdbak/droppr/releases/tag/v0.2.0
[0.1.0]: https://github.com/micahdbak/droppr/releases/tag/v0.1.0
