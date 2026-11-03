//! A native error dialog for problems that stop Yambuck from starting.

/// Shows `message` in a modal GTK error dialog and returns when it is closed.
/// GTK is initialised by Tauri before `setup` runs, which is the only caller.
pub fn show_error(title: &str, message: &str) {
    use gtk::prelude::{DialogExt, GtkWindowExt, WidgetExt};

    let dialog = gtk::MessageDialog::new(
        None::<&gtk::Window>,
        gtk::DialogFlags::MODAL,
        gtk::MessageType::Error,
        gtk::ButtonsType::Close,
        message,
    );
    dialog.set_title(title);
    dialog.run();
    dialog.close();
    dialog.hide();
}
