use std::collections::HashMap;

use crate::{
    InstallOptionDefinition, InstallOptionInputType, InstallOptionSubmission, InstallOptionValue,
    YambuckError,
};

pub fn validate_install_options(
    definitions: &[InstallOptionDefinition],
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, YambuckError> {
    let mut provided = HashMap::<String, InstallOptionValue>::new();
    for submission in submissions {
        if submission.id.trim().is_empty() {
            return Err(YambuckError::InvalidInstallOptions(
                "installer option id cannot be empty".to_string(),
            ));
        }
        if provided.contains_key(&submission.id) {
            return Err(YambuckError::InvalidInstallOptions(format!(
                "duplicate installer option value provided for `{}`",
                submission.id
            )));
        }
        provided.insert(submission.id, submission.value);
    }

    let mut normalized = Vec::<InstallOptionSubmission>::new();

    for definition in definitions {
        let provided_value = provided.remove(&definition.id);
        let resolved_value = resolve_option_value(definition, provided_value)?;
        if let Some(value) = resolved_value {
            normalized.push(InstallOptionSubmission {
                id: definition.id.clone(),
                value,
            });
        }
    }

    if !provided.is_empty() {
        let mut unknown_ids = provided.keys().cloned().collect::<Vec<String>>();
        unknown_ids.sort();
        return Err(YambuckError::InvalidInstallOptions(format!(
            "unknown installer option ids: {}",
            unknown_ids.join(", ")
        )));
    }

    Ok(normalized)
}

fn resolve_option_value(
    definition: &InstallOptionDefinition,
    provided: Option<InstallOptionValue>,
) -> Result<Option<InstallOptionValue>, YambuckError> {
    let resolved = match provided {
        Some(value) => value,
        None => match default_value_for_definition(definition)? {
            Some(value) => value,
            None if definition.required => {
                return Err(YambuckError::InvalidInstallOptions(format!(
                    "missing required installer option `{}`",
                    definition.id
                )));
            }
            None => return Ok(None),
        },
    };

    validate_value_type(definition, resolved).map(Some)
}

fn default_value_for_definition(
    definition: &InstallOptionDefinition,
) -> Result<Option<InstallOptionValue>, YambuckError> {
    let Some(default_value) = definition.default_value.as_ref() else {
        return Ok(None);
    };

    match definition.input_type {
        InstallOptionInputType::Select => {
            Ok(Some(InstallOptionValue::Select(default_value.to_string())))
        }
        InstallOptionInputType::Text => {
            Ok(Some(InstallOptionValue::Text(default_value.to_string())))
        }
        InstallOptionInputType::Checkbox => {
            let parsed = default_value.parse::<bool>().map_err(|_| {
                YambuckError::InvalidInstallOptions(format!(
                    "invalid default checkbox value for installer option `{}`",
                    definition.id
                ))
            })?;
            Ok(Some(InstallOptionValue::Checkbox(parsed)))
        }
    }
}

fn validate_value_type(
    definition: &InstallOptionDefinition,
    value: InstallOptionValue,
) -> Result<InstallOptionValue, YambuckError> {
    match (&definition.input_type, value) {
        (InstallOptionInputType::Select, InstallOptionValue::Select(selected)) => {
            let is_valid_choice = definition
                .choices
                .iter()
                .any(|choice| choice.value == selected);
            if !is_valid_choice {
                return Err(YambuckError::InvalidInstallOptions(format!(
                    "invalid selection for installer option `{}`: `{}`",
                    definition.id, selected
                )));
            }
            Ok(InstallOptionValue::Select(selected))
        }
        (InstallOptionInputType::Checkbox, InstallOptionValue::Checkbox(value)) => {
            Ok(InstallOptionValue::Checkbox(value))
        }
        (InstallOptionInputType::Text, InstallOptionValue::Text(text)) => {
            let trimmed = text.trim().to_string();
            if definition.required && trimmed.is_empty() {
                return Err(YambuckError::InvalidInstallOptions(format!(
                    "installer option `{}` requires a non-empty value",
                    definition.id
                )));
            }
            Ok(InstallOptionValue::Text(trimmed))
        }
        _ => Err(YambuckError::InvalidInstallOptions(format!(
            "installer option `{}` has value type that does not match schema",
            definition.id
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::validate_install_options;
    use crate::{
        InstallOptionChoice, InstallOptionDefinition, InstallOptionInputType,
        InstallOptionSubmission, InstallOptionValue,
    };

    #[test]
    fn validates_and_normalizes_text_option() {
        let definitions = vec![InstallOptionDefinition {
            id: "installArg".to_string(),
            label: "Install arg".to_string(),
            description: None,
            input_type: InstallOptionInputType::Text,
            required: true,
            default_value: None,
            choices: Vec::new(),
        }];

        let submissions = vec![InstallOptionSubmission {
            id: "installArg".to_string(),
            value: InstallOptionValue::Text("  value  ".to_string()),
        }];

        let normalized =
            validate_install_options(&definitions, submissions).expect("expected valid options");
        assert_eq!(normalized.len(), 1);
        match &normalized[0].value {
            InstallOptionValue::Text(value) => assert_eq!(value, "value"),
            _ => panic!("expected text option value"),
        }
    }

    #[test]
    fn rejects_unknown_option_id() {
        let definitions = vec![];
        let submissions = vec![InstallOptionSubmission {
            id: "unknown".to_string(),
            value: InstallOptionValue::Text("x".to_string()),
        }];

        let error = validate_install_options(&definitions, submissions)
            .expect_err("expected unknown option rejection");
        assert!(error.to_string().contains("unknown installer option ids"));
    }

    #[test]
    fn validates_select_choices() {
        let definitions = vec![InstallOptionDefinition {
            id: "mode".to_string(),
            label: "Mode".to_string(),
            description: None,
            input_type: InstallOptionInputType::Select,
            required: true,
            default_value: None,
            choices: vec![InstallOptionChoice {
                value: "standard".to_string(),
                label: "Standard".to_string(),
                description: None,
            }],
        }];

        let submissions = vec![InstallOptionSubmission {
            id: "mode".to_string(),
            value: InstallOptionValue::Select("invalid".to_string()),
        }];

        let error = validate_install_options(&definitions, submissions)
            .expect_err("expected invalid select value rejection");
        assert!(error.to_string().contains("invalid selection"));
    }
}
