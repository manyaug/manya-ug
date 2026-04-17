export interface QuestStep {
    id?: string;
    file?: string;
    topic?: string;
    mode?: string;
    engineType: string;
    isStudySim?: boolean;
    item_type?: string;
    data?: any;
    referencePath?: string;
    [key: string]: any;
}

export interface QuestMeta {
    title: string;
    subject: string;
    topic?: string;
    variantTitle?: string;
    nodeType?: string;
    status?: string;
    error?: string;
    url?: string;
    contentType?: string;
}

export interface Quest {
    steps: QuestStep[];
    meta: QuestMeta;
}
