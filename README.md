# csds

## Notes for Linux

You need to have the following dependencies installed in your system<sup>[1]</sup>.

```
dpkg --add-architecture i386
apt-get update
apt-get install lib32gcc-s1
```

When using CSGODS, the path `~/Steam` will be created by SteamCMD to store Steam-related stuff. The dedicated server files will be stored in `[path]/.steamcmd/steamcmd`.

[1]: https://developer.valvesoftware.com/wiki/SteamCMD#Package_From_Repositories