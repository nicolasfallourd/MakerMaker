# Specification – Instagram Story Generator Tool

## Goal

Provide a simple web interface where users can upload an image and generate Instagram Story text content using GPT, based on a fixed creative prompt. The tool is meant to help creators and marketers quickly craft story copy aligned with their visual assets.

---

## User Flow

1. **Upload**
   - The user lands on the page and sees a clean, minimal interface.
   - A single image upload field is presented.
   - The user uploads one image file.

2. **Prompt Display**
   - A fixed prompt appears automatically under the image.
   - This prompt is pre-written and not editable.

3. **Generate**
   - A button labeled **"Create a Story"** is available below the prompt.
   - When clicked, it sends the image and the prompt to a GPT model (text-only).

4. **Result Display**
   - The tool receives and displays a GPT-generated response below the button.
   - The result is plain text that the user can read or copy.

---

## Prompt Used (Fixed)

> Create an Instagram Story from this image. Highlight the product (on the right) using the style of the Story (on the left). Do not alter the product — strictly preserve it.

---

## Key Functional Requirements

- **Image Upload:** The tool must accept a single image upload (JPG, PNG, etc).
- **Fixed Prompt Display:** The prompt is always shown below the image and cannot be changed.
- **One-Click Generation:** A single button click triggers content generation.
- **Use GPT Only:** Only GPT text-based models should be used (no image generation like DALL·E).
- **Output as Text:** The GPT output must be returned as plain text and shown clearly.

---

## Constraints

- No sign-in, no user account required.
- No image editing or prompt customization.
- Keep the interface minimal and intuitive.
- Requires OpenAI API key (provided by the user).

---

## Target Users

- Small business owners
- Content creators
- Marketers
- Designers preparing content for Instagram

---

## Success Criteria

- User can upload an image without friction.
- The fixed prompt appears clearly.
- GPT responds in a few seconds.
- The user receives usable Instagram Story text in a simple format.

