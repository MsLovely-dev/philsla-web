from django.db import migrations, models


def drop_legacy_source_column(apps, schema_editor):
    table_name = "applications_studentapplication"
    existing_columns = {
        column.name
        for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(),
            table_name,
        )
    }
    if "source" not in existing_columns:
        return

    StudentApplication = apps.get_model("applications", "StudentApplication")
    legacy_field = models.CharField(max_length=40, default="STUDENT_REGISTRATION")
    legacy_field.set_attributes_from_name("source")
    schema_editor.remove_field(StudentApplication, legacy_field)


class Migration(migrations.Migration):
    dependencies = [
        ("applications", "0014_bulk_upload_application_metadata"),
    ]

    operations = [
        migrations.RunPython(drop_legacy_source_column, migrations.RunPython.noop),
    ]
