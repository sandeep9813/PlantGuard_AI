from ai.class_names import SUPPORTED_CROPS


def has_nepali_text(message):
    return any("\u0900" <= char <= "\u097f" for char in message)


def supported_crops_text():
    if not SUPPORTED_CROPS:
        return ""
    return ", ".join(SUPPORTED_CROPS[:-1]) + f", and {SUPPORTED_CROPS[-1]}"


def tokenize_query(message_clean):
    message_words_clean = message_clean
    for sym in [".", ",", "?", "!", "-", "(", ")", "_", "/"]:
        message_words_clean = message_words_clean.replace(sym, " ")
    return set(message_words_clean.split())


class GeneralPlantAnswerProvider:
    def answer(self, message_clean, query_words):
        if has_nepali_text(message_clean):
            answer = self._nepali_answer(message_clean)
            if answer:
                return answer

        asks_about_disease = bool({"disease", "diseases", "infection", "infections"} & query_words)
        asks_about_plants = bool({"plant", "plants", "crop", "crops"} & query_words)

        if asks_about_plants and asks_about_disease and any(
            term in message_clean for term in ["what is", "what are", "define", "meaning"]
        ):
            return (
                "**Plant Disease**\n\n"
                "A plant disease is a condition that stops a plant from growing normally or staying healthy. "
                "It may affect leaves, stems, roots, flowers, or fruit.\n\n"
                "**Common Causes**\n"
                "- Fungi, bacteria, viruses, and nematodes\n"
                "- Poor soil drainage or overwatering\n"
                "- Nutrient deficiency or excess fertilizer\n"
                "- Pest damage that opens wounds for infection\n"
                "- Humid weather, weak airflow, and infected plant debris\n\n"
                "**Common Signs**\n"
                "- Spots, blight, mold, rust, or powdery patches on leaves\n"
                "- Yellowing, curling, wilting, or stunted growth\n"
                "- Rotting roots, stems, fruit, or flowers\n"
                "- Unusual patterns such as mosaics, rings, or streaks\n\n"
                "**What To Do First**\n"
                "Remove badly affected leaves, avoid overhead watering, improve airflow, and keep the plant separate if infection may spread."
            )

        if asks_about_disease and any(word in query_words for word in ["cause", "causes", "causing", "why"]):
            return (
                "**Causes Of Plant Disease**\n\n"
                "Plant diseases usually happen when a harmful organism, a weak plant, and favorable weather meet at the same time.\n\n"
                "**Main Causes**\n"
                "- Fungal spores growing in wet or humid conditions\n"
                "- Bacteria entering through wounds, splashing water, or infected tools\n"
                "- Viruses spread by insects such as aphids, whiteflies, or leafhoppers\n"
                "- Soil problems such as poor drainage, low nutrients, or wrong pH\n"
                "- Reusing infected soil, pots, seeds, or plant debris\n\n"
                "**Prevention**\n"
                "Use clean tools, water near the soil, remove infected leaves, rotate crops, and choose healthy seeds or seedlings."
            )

        if any(word in query_words for word in ["prevent", "prevention", "avoid", "stop", "protect"]):
            return (
                "**Preventing Plant Diseases**\n\n"
                "- Water at the base of the plant instead of wetting leaves\n"
                "- Keep enough spacing between plants for airflow\n"
                "- Remove fallen leaves and infected plant parts\n"
                "- Use clean tools and wash hands after handling diseased plants\n"
                "- Rotate crops each season when possible\n"
                "- Avoid overwatering and improve soil drainage\n"
                "- Inspect plants often so problems are caught early\n\n"
                "**Best Habit**\n"
                "Check the underside of leaves every few days. Many diseases and pests show early signs there first."
            )

        if any(word in query_words for word in ["symptom", "symptoms", "sign", "signs", "identify", "recognize"]):
            return (
                "**Common Plant Disease Symptoms**\n\n"
                "- Yellow or brown spots on leaves\n"
                "- White powder, fuzzy mold, rust-colored patches, or dark lesions\n"
                "- Leaf curling, wilting, drying, or early leaf drop\n"
                "- Soft, black, or watery rot on roots, stems, or fruit\n"
                "- Stunted growth or poor flowering and fruiting\n"
                "- Mosaic patterns, streaks, or distorted new leaves\n\n"
                "**Quick Check**\n"
                "If symptoms spread from one leaf to many leaves, or from one plant to nearby plants, treat it as a possible disease."
            )

        if any(word in query_words for word in ["treat", "treatment", "cure", "control", "fix"]):
            return (
                "**General Plant Disease Treatment**\n\n"
                "- Remove and destroy badly infected leaves or fruit\n"
                "- Keep leaves dry by watering at soil level\n"
                "- Improve airflow by pruning crowded growth\n"
                "- Use organic options like neem oil, sulfur, copper, or biofungicides when suitable\n"
                "- For severe infections, use a disease-specific fungicide or bactericide\n"
                "- Do not compost infected plant material unless your compost gets hot enough\n\n"
                "**Important**\n"
                "Treatment depends on the exact disease. You can ask me about a specific crop, like \"How do I treat tomato early blight?\""
            )

        if "fungal" in query_words or "fungus" in query_words or "fungi" in query_words:
            return (
                "**Fungal Plant Diseases**\n\n"
                "Fungal diseases are among the most common plant problems. They often spread through spores and become worse in humid, wet, or crowded conditions.\n\n"
                "**Examples**\n"
                "- Powdery mildew\n"
                "- Early blight and late blight\n"
                "- Rusts and leaf spots\n"
                "- Fruit rots and root rots\n\n"
                "**Basic Control**\n"
                "Improve airflow, avoid wet leaves, remove infected debris, and use sulfur, copper, neem oil, or a recommended fungicide when needed."
            )

        if "bacterial" in query_words or "bacteria" in query_words:
            return (
                "**Bacterial Plant Diseases**\n\n"
                "Bacterial diseases often enter through wounds or natural openings in the plant. They can spread through splashing water, infected tools, insects, and contaminated seeds.\n\n"
                "**Common Signs**\n"
                "- Water-soaked spots\n"
                "- Leaf spots with yellow halos\n"
                "- Oozing, soft rot, or wilting\n\n"
                "**Basic Control**\n"
                "Remove infected parts, avoid overhead watering, sanitize tools, and use copper-based sprays when appropriate."
            )

        if "viral" in query_words or "virus" in query_words or "viruses" in query_words:
            return (
                "**Viral Plant Diseases**\n\n"
                "Viral diseases cannot usually be cured once a plant is infected. They are commonly spread by insects, infected seeds, cuttings, or contaminated tools.\n\n"
                "**Common Signs**\n"
                "- Mosaic or mottled leaf patterns\n"
                "- Leaf curling or distortion\n"
                "- Stunted growth\n"
                "- Poor fruit development\n\n"
                "**Basic Control**\n"
                "Remove badly infected plants, control insect vectors, sanitize tools, and use disease-free seeds or seedlings."
            )

        if any(term in message_clean for term in ["what can you do", "help me with", "what do you support", "supported crops"]):
            return (
                "**PlantGuard AI Help**\n\n"
                "I can answer general plant health questions and give disease-specific guidance for supported crops.\n\n"
                "**Supported Crops**\n"
                f"{supported_crops_text()}.\n\n"
                "**Try Asking**\n"
                "- What is plant disease?\n"
                "- What causes plant diseases?\n"
                "- How can I prevent plant diseases?\n"
                "- What are symptoms of fungal disease?\n"
                "- How do I treat tomato early blight?"
            )

        return None

    def _nepali_answer(self, message_clean):
        if not any(word in message_clean for word in ["रोग", "बिरुवा", "बाली"]):
            return None

        if any(word in message_clean for word in ["के हो", "भनेको", "अर्थ"]):
            return (
                "**बिरुवाको रोग**\n\n"
                "बिरुवाको रोग भनेको बिरुवाको सामान्य वृद्धि, पात, डाँठ, जरा, फूल वा फलमा असर पार्ने अवस्था हो। "
                "यो फंगस, ब्याक्टेरिया, भाइरस, किराको क्षति, धेरै चिस्यान, खराब माटो वा पोषणको कमीका कारण हुन सक्छ।\n\n"
                "**सामान्य लक्षणहरू**\n"
                "- पातमा पहेंलो, खैरो वा कालो दाग\n"
                "- पात बटारिनु, ओइलाउनु वा झर्नु\n"
                "- सेतो धुलो जस्तो तह, ढुसी वा कुहिने समस्या\n"
                "- बोट सानो रहनु वा फल राम्रो नलाग्नु\n\n"
                "**पहिलो काम**\n"
                "संक्रमित पात हटाउनुहोस्, पात भिज्ने गरी पानी नहाल्नुहोस्, हावा चल्ने ठाउँ मिलाउनुहोस्, र समस्या फैलिँदैछ कि छैन हेर्नुहोस्।"
            )

        if any(word in message_clean for word in ["रोकथाम", "बचाउने", "जोगाउने", "रोक्ने"]):
            return (
                "**बिरुवाको रोग रोकथाम**\n\n"
                "- पानी पातमा होइन, जराको नजिक हाल्नुहोस्\n"
                "- बिरुवाबीच पर्याप्त दूरी राख्नुहोस्\n"
                "- झरेका वा संक्रमित पात हटाउनुहोस्\n"
                "- औजार सफा राख्नुहोस्\n"
                "- सकेसम्म बाली चक्र अपनाउनुहोस्\n"
                "- धेरै पानी जम्न नदिनुहोस्\n\n"
                "**राम्रो बानी**\n"
                "पातको तल्लो भाग नियमित हेर्नुहोस्, धेरै रोग र किराको सुरुवाती संकेत त्यहीँ देखिन्छ।"
            )

        if any(word in message_clean for word in ["उपचार", "ठिक", "निको", "नियन्त्रण"]):
            return (
                "**सामान्य उपचार**\n\n"
                "- धेरै संक्रमित पात वा फल हटाउनुहोस्\n"
                "- पानी हाल्दा पात भिज्न नदिनुहोस्\n"
                "- हावा चल्ने बनाउन बाक्लो हाँगा छाँट्नुहोस्\n"
                "- आवश्यक भए नीम तेल, कपर, सल्फर वा उपयुक्त जैविक फंगिसाइड प्रयोग गर्नुहोस्\n"
                "- रोग धेरै फैलिएको छ भने रोगअनुसारको औषधि प्रयोग गर्नुहोस्\n\n"
                "**नोट**\n"
                "ठ्याक्कै उपचार रोगअनुसार फरक हुन्छ। तपाईंले \"tomato early blight को उपचार\" जस्तो सोध्न सक्नुहुन्छ।"
            )

        if any(word in message_clean for word in ["लक्षण", "चिन्ने", "पहिचान"]):
            return (
                "**सामान्य लक्षणहरू**\n\n"
                "- पातमा दाग, पहेंलोपन वा कालोपन\n"
                "- पात बटारिनु, सुक्नु वा झर्नु\n"
                "- सेतो ढुसी, खिया जस्तो दाग वा कुहिने भाग\n"
                "- बोटको वृद्धि रोकिनु\n"
                "- फलमा दाग, फाट्ने वा कुहिने समस्या\n\n"
                "**छिटो जाँच**\n"
                "एउटा पातबाट धेरै पात वा अर्को बोटमा फैलिँदैछ भने रोग हुन सक्ने सम्भावना बढी हुन्छ।"
            )

        return None
