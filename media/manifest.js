/* Videos for the π²-Flow page. Paths are relative to index.html.
 * Clips live in docs/assets/videos, shared with the first version of the page (Wan2.1-1.3B, 81 frames at 832x480, 16 fps).
 * Thumbnails (media/thumbs, 240x138) are the frame at 2.5 s of our 4-NFE clip.
 *
 * quality:   one entry per prompt. ours[4], ours[2]; each baseline key gives { 4: clip, 2: clip }.
 *            A baseline listed in `baselines` but missing from an entry gets no tile (DMD2 has no clips yet).
 * diversity: one entry per prompt; four of the five evaluation seeds, the same for every method and NFE, keyed by NFE
 *            (2-NFE clips carry _n2). */
(function () {
  'use strict';
  var V = 'assets/videos/';
  function q(id, title, prompt) {
    return {
      title: title, prompt: prompt, thumb: 'media/thumbs/' + id + '.jpg',
      ours: { 4: V + id + '_ours_nfe4.mp4', 2: V + id + '_ours_nfe2.mp4' },
      anyflow: { 4: V + id + '_anyflow_nfe4.mp4', 2: V + id + '_anyflow_nfe2.mp4' },
      rcm: { 4: V + id + '_rcm_nfe4.mp4', 2: V + id + '_rcm_nfe2.mp4' }
    };
  }
  function seeds(id, m, ss) {
    function at(tag) { return ss.map(function (s) { return V + id + '_' + m + tag + '_s' + s + '.mp4'; }); }
    return { 4: at(''), 2: at('_n2') };
  }
  function d(id, title, prompt, ss) {
    return {
      title: title, prompt: prompt, thumb: 'media/thumbs/' + id + '.jpg',
      methods: [
        { name: '\\(\\pi^2\\)-Flow', k: 'flow map', ours: true, seeds: seeds(id, 'ours', ss) },
        { name: 'AnyFlow', k: 'DMD', seeds: seeds(id, 'anyflow', ss) },
        { name: 'rCM', k: 'DMD', seeds: seeds(id, 'rcm', ss) }
      ]
    };
  }

  window.PI2_MEDIA = {
    baselines: [
      { key: 'anyflow', name: 'AnyFlow', kind: 'DMD' },
      { key: 'rcm', name: 'rCM', kind: 'DMD' },
      { key: 'dmd2', name: 'DMD2', kind: 'DMD' }
    ],
    quality: [
      q('mg29', "Bearded man", "An extreme close-up of an gray-haired man with a beard in his 60s, he is deep in thought pondering the history of the universe as he sits at a cafe in Paris, his eyes focus on people offscreen as they walk as he sits mostly motionless, he is dressed in a wool coat suit coat with a button-down shirt , he wears a brown beret and glasses and has a very professorial appearance, and the end he offers a subtle closed-mouth smile as if he found the answer to the mystery of life, the lighting is very cinematic with the golden light and the Parisian streets and city in the background, depth of field, cinematic 35mm film."),
      q('mg43', "Garden cat", "A white and orange tabby cat is seen happily darting through a dense garden, as if chasing something. Its eyes are wide and happy as it jogs forward, scanning the branches, flowers, and leaves as it walks. The path is narrow as it makes its way between all the plants. the scene is captured from a ground-level angle, following the cat closely, giving a low and intimate perspective. The image is cinematic with warm tones and a grainy texture. The scattered daylight between the leaves and plants above creates a warm contrast, accentuating the cat’s orange fur. The shot is clear and sharp, with a shallow depth of field."),
      q('mg4', "Fluffy monster", "Animated scene features a close-up of a short fluffy monster kneeling beside a melting red candle. The art style is 3D and realistic, with a focus on lighting and texture. The mood of the painting is one of wonder and curiosity, as the monster gazes at the flame with wide eyes and open mouth. Its pose and expression convey a sense of innocence and playfulness, as if it is exploring the world around it for the first time. The use of warm colors and dramatic lighting further enhances the cozy atmosphere of the image."),
      q('mg0', "Tokyo walk", "A stylish woman walks down a Tokyo street filled with warm glowing neon and animated city signage. She wears a black leather jacket, a long red dress, and black boots, and carries a black purse. She wears sunglasses and red lipstick. She walks confidently and casually. The street is damp and reflective, creating a mirror effect of the colorful lights. Many pedestrians walk about."),
      q('mg2', "Space man", "A movie trailer featuring the adventures of the 30 year old space man wearing a red wool knitted motorcycle helmet, blue sky, salt desert, cinematic style, shot on 35mm film, vivid colors."),
      q('mg40', "Surfing otter", "An adorable happy otter confidently stands on a surfboard wearing a yellow lifejacket, riding along turquoise tropical waters near lush tropical islands, 3D digital render art style."),
      q('mg64', "Gobi rider", "A man riding a horse through the Gobi Desert with a beautiful sunset behind him, movie quality."),
      q('mg69', "Blue parrot", "Close-up of a bright blue parrot's feathers glittering in the light, showing its unique plumage and vibrant colors"),
      q('mg67', "Rally car", "A rally car taking a fast turn on a track"),
      q('mg70', "Train reflection", "Subtle reflections of a woman on the window of a train moving at hyper-speed in a Japanese city.")
    ],
    diversity: [
      d('div833', "Nebula corgi", "A corgi's head depicted as an explosion of a nebula", [0, 1, 2, 3]),
      d('div279', "Laughing", "A person is laughing", [0, 1, 2, 4]),
      d('div444', "Cat", "a cat", [0, 1, 2, 3]),
      d('div316', "Beard trim", "A person is trimming or shaving beard", [0, 1, 2, 3]),
      d('div831', "Raccoon guitarist", "A raccoon is playing the electronic guitar.", [1, 2, 3, 4]),
      d('div446', "Horse", "a horse", [0, 1, 2, 3]),
      d('div825', "Vampire makeup", "Vampire makeup face of beautiful girl, red contact lenses.", [0, 1, 2, 3]),
      d('div832', "Seine boat", "A boat sailing leisurely along the Seine River with the Eiffel Tower in background by Vincent van Gogh", [0, 1, 2, 3]),
      d('div839', "Shuttle launch", "A space shuttle launching into orbit, with flames and smoke billowing out from the engines", [0, 1, 2, 3]),
      d('div548', "Red suitcase", "a red suitcase", [0, 1, 2, 3])
    ]
  };
})();
