/* @ngInject */
function contactImporter($rootScope, contactSchema, importContactModal, notification, vcard, csv, gettextCatalog, networkActivityTracker) {
    const I18N = {
        noFiles: gettextCatalog.getString('No files were selected', null, 'Error'),
        invalid: gettextCatalog.getString('Invalid file type', null, 'Error'),
        parsingCSV: gettextCatalog.getString('Cannot convert the file', null, 'Error')
    };

    const dispatch = (data = []) =>
        $rootScope.$emit('contacts', { type: 'createContact', data: { contacts: contactSchema.prepare(data), mode: 'import' } });

    const importVCF = async (reader) => dispatch(vcard.from(reader.result));

    const importVCard = (file) => {
        return csv
            .csvToVCard(file)
            .then((parsed = []) => parsed.length && dispatch(parsed))
            .catch((e) => {
                console.error(e);
                throw new Error(I18N.parsingCSV);
            });
    };

    const MAP_SRC = {
        '.vcf': importVCF,
        '.csv': importVCard
    };

    const importFiles = (files = []) => {
        if (!files.length) {
            return notification.error(I18N.noFiles);
        }

        const reader = new FileReader();
        const file = files[0];
        const extension = file.name.slice(-4);

        reader.onload = (e) => notification.error(e);
        reader.onload = () => {
            if (!MAP_SRC[extension]) {
                notification.error(I18N.invalid);
                return importContactModal.deactivate();
            }
            const parameter = extension === '.vcf' ? reader : file;
            const promise = MAP_SRC[extension](parameter).then(() => importContactModal.deactivate());
            networkActivityTracker.track(promise);
        };

        reader.readAsText(file, 'utf-8');
    };

    return () => {
        importContactModal.activate({
            params: {
                import: importFiles,
                cancel() {
                    importContactModal.deactivate();
                }
            }
        });
    };
}
export default contactImporter;
