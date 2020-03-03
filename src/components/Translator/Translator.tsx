/**
 * Class to handle string translation by given translation object
 */
export class Translator {
    private static instance: Translator | null;
    private static translations: Record<string, string> | undefined;

    static getTranslator(): Translator {
        if (!Translator.instance) {
            Translator.instance = new Translator();
        }

        return Translator.instance;
    }

    translate = (value: string): string => {
        if (Translator.translations && Translator.translations[value]) {
            return Translator.translations[value];
        }
        return value;
    };

    init = (translations?: Record<string, string>) => {
        Translator.translations = translations;
    };
}
