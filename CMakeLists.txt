# SPDX-License-Identifier: GPL-2.0-or-later
#
# Canonical KDE build for the window-sections KWin script. The JavaScript bundle
# is produced by npm/esbuild; this CMake project only installs the KPackage
# payload to the KWin scripts directory.

cmake_minimum_required(VERSION 3.16)

project(window-sections VERSION 0.1.0 LANGUAGES NONE)

find_package(ECM 6.0 REQUIRED NO_MODULE)
set(CMAKE_MODULE_PATH ${ECM_MODULE_PATH})

include(KDEInstallDirs)

# The repository root is also the KPackage root, but the development tree
# (src, test, tooling) must never end up in the installation, so the payload is
# listed explicitly.
install(FILES metadata.json
        DESTINATION ${KDE_INSTALL_DATADIR}/kwin/scripts/window-sections)
install(DIRECTORY contents/
        DESTINATION ${KDE_INSTALL_DATADIR}/kwin/scripts/window-sections/contents)
