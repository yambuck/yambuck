pub fn package_arg_from_launch_args(args: &[String]) -> Option<String> {
    args.iter()
        .skip(1)
        .find_map(|value| normalize_package_arg(value))
}

fn normalize_package_arg(raw: &str) -> Option<String> {
    let mut value = raw.to_string();
    if let Some(stripped) = value.strip_prefix("file://") {
        value = stripped.to_string();
    }
    value = percent_decode(&value);
    if value.ends_with(".yambuck") {
        Some(value)
    } else {
        None
    }
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = String::with_capacity(input.len());
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = &input[index + 1..index + 3];
            if let Ok(value) = u8::from_str_radix(hex, 16) {
                out.push(value as char);
                index += 3;
                continue;
            }
        }
        out.push(bytes[index] as char);
        index += 1;
    }
    out
}
