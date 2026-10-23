# order

## Development

Lattice drawings are computed by [odis](https://github.com/domduerr/odis), compiled to WebAssembly from the Rust crate in `wasm/`. Building it needs Rust with the `wasm32-unknown-unknown` target and a `wasm-bindgen` CLI matching the version in `wasm/Cargo.lock`:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129 --locked
```

Then:

```sh
npm install
npm run dev
```

`npm run dev` and `npm run build` rebuild the WebAssembly module first.

## License

The drawing module in `wasm/` builds on odis and is licensed under AGPL-3.0, like odis itself.
